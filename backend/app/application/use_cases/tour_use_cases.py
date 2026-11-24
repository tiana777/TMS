"""Tour, Courier, and Dispute Application Use Cases."""

from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.application.dtos.other_dtos import (
    CloseTourDTO,
    CourierResponseDTO,
    CreateCourierDTO,
    CreateDisputeDTO,
    DisputeResponseDTO,
    RepayDebtDTO,
    ScorecardResponseDTO,
    TourDetailResponseDTO,
    TourResponseDTO,
    UpdateCourierProfileDTO,
)
from backend.app.domain.exceptions import BusinessRuleViolationException
from backend.app.domain.models.courier import Courier
from backend.app.domain.models.dispute import CourierDebt, IncidentType
from backend.app.domain.models.tour import Tour, TourStatus
from backend.app.domain.services.scorecard_engine import ScorecardEngine
from backend.app.domain.models.parcel import FluxType
from backend.app.domain.state_machine.parcel_fsm import ParcelStatus
from backend.app.domain.value_objects.money import Money
from backend.app.domain.value_objects.phone_number import PhoneNumber
from backend.app.infrastructure.persistence.models import (
    CourierDebtORM,
    CourierORM,
    DebtRepaymentORM,
    ParcelORM,
    ParcelStatusHistoryORM,
    PerformanceEvaluationORM,
    TourORM,
)
from backend.app.infrastructure.persistence.repositories import (
    PostgresCourierRepository,
    PostgresDisputeRepository,
    PostgresParcelRepository,
    PostgresTourRepository,
)


class TourUseCases:
    def __init__(self, db: Session):
        self.db = db
        self.tour_repo = PostgresTourRepository(db)
        self.parcel_repo = PostgresParcelRepository(db)
        self.courier_repo = PostgresCourierRepository(db)
        self.dispute_repo = PostgresDisputeRepository(db)

    def _to_tour_dto(self, t: Tour) -> TourResponseDTO:
        discrepancy = (t.actual_remitted.amount + t.expenses_amount.amount) - t.theoretical_total.amount
        return TourResponseDTO(
            id=t.id,
            tour_date=t.tour_date,
            courier_id=t.courier_id,
            status=t.status.value,
            theoretical_total=t.theoretical_total.amount,
            actual_remitted=t.actual_remitted.amount,
            discrepancy=discrepancy,
            expenses_amount=t.expenses_amount.amount,
            expenses_reason=t.expenses_reason,
            closed_at=t.closed_at.isoformat() if t.closed_at else None,
        )

    def create_or_assign_tour(
        self,
        courier_id: int,
        tour_date: str,
        parcel_ids: List[int],
        user_role: str = "SUPER_ADMIN",
        reason: Optional[str] = None,
    ) -> TourResponseDTO:
        # Check courier existence and capacity limit
        courier = self.courier_repo.get_by_id(courier_id)
        if not courier:
            raise NotFoundException(f"Livreur introuvable (ID: {courier_id})")

        # Check if tour exists for courier and date
        existing = self.tour_repo.get_by_courier_and_date(courier_id, tour_date)
        if existing:
            tour = existing
            current_parcels = (
                self.db.query(ParcelORM)
                .filter(ParcelORM.tournee_id == tour.id, ParcelORM.actif == 1)
                .all()
            )
            existing_ids = {p.id for p in current_parcels}
            existing_urban = {
                p.id for p in current_parcels
                if p.type_flux != "PROVINCE" and "PROV" not in str(p.axe).upper()
            }
        else:
            tour = Tour(
                tour_date=tour_date,
                courier_id=courier_id,
                status=TourStatus.ASSIGNE,
            )
            tour = self.tour_repo.save(tour)
            existing_ids = set()
            existing_urban = set()

        # Enforce configurable maximum parcel capacity per courier & strict 30-parcel surcharge limit
        # The 30-parcel limit applies EXCLUSIVELY to urban deliveries (Grand Tanà).
        # Province parcels (transport to cooperatives / bus stations) are exempt from this ceiling.
        new_unique_ids = [pid for pid in parcel_ids if pid not in existing_ids]
        new_urban_count = 0
        for pid in new_unique_ids:
            p_obj = self.parcel_repo.get_by_id(pid)
            if p_obj and p_obj.flux_type != FluxType.PROVINCE and "PROV" not in str(p_obj.axis).upper():
                new_urban_count += 1

        total_projected_urban = len(existing_urban) + new_urban_count
        if total_projected_urban > courier.max_parcels or total_projected_urban > 30:
            raise BusinessRuleViolationException(
                f"Capacité maximale dépassée / Surcharge détectée : le livreur {courier.name} ne peut prendre que "
                f"{min(courier.max_parcels, 30)} colis urbains maximum par tournée ({total_projected_urban} colis urbains demandés). "
                f"Le plafond de 30 colis s'applique uniquement aux livraisons en ville (les colis province sont exemptés)."
            )

        # Assign or reassign parcels
        for pid in parcel_ids:
            p = self.parcel_repo.get_by_id(pid)
            if not p:
                continue

            # Check role-based FSM reassignment rules according to CDC Section 3 & 8.1
            if p.status == ParcelStatus.EN_COURS:
                if user_role != "SUPER_ADMIN":
                    raise BusinessRuleViolationException(
                        f"Le colis BDR-{p.tracking_number} est déjà en cours de tournée. "
                        f"Seul le Super Admin est habilité à effectuer une réassignation d'urgence."
                    )
            elif p.status not in [ParcelStatus.EN_DEPOT, ParcelStatus.ASSIGNE, ParcelStatus.REPORTE]:
                raise BusinessRuleViolationException(
                    f"Impossible d'assigner le colis BDR-{p.tracking_number} au statut '{p.status.value}'."
                )

            old_status = p.status
            assignment_motif = (
                reason
                or (f"Réassignation d'urgence (Super Admin) vers la tournée #{tour.id}"
                    if old_status == ParcelStatus.EN_COURS
                    else f"Assigné à la tournée #{tour.id}")
            )

            p.assign_to_courier(courier_id, tour.id, reason=assignment_motif)
            self.parcel_repo.save(p)

            # Audit trail
            history = ParcelStatusHistoryORM(
                colis_id=p.id,
                statut_precedent=old_status.value,
                statut_nouveau=ParcelStatus.ASSIGNE.value,
                motif=assignment_motif,
                horodatage=datetime.utcnow(),
            )
            self.db.add(history)

        self.db.commit()

        # Refresh tour parcels and theoretical total
        tour_parcels = self.db.query(ParcelORM).filter(ParcelORM.tournee_id == tour.id, ParcelORM.actif == 1).all()
        tour.parcels = [self.parcel_repo._to_domain(po) for po in tour_parcels]
        tour.calculate_theoretical_total()
        saved = self.tour_repo.save(tour)
        return self._to_tour_dto(saved)

    def get_tour_detail(self, tour_id: int) -> TourDetailResponseDTO:
        from backend.app.application.use_cases.parcel_use_cases import ParcelUseCases

        tour_orm = self.db.query(TourORM).filter(TourORM.id == tour_id).first()
        if not tour_orm:
            raise BusinessRuleViolationException(f"Tournée introuvable (ID: {tour_id})")

        courier_orm = self.db.query(CourierORM).filter(CourierORM.id == tour_orm.livreur_id).first()
        parcel_orms = (
            self.db.query(ParcelORM)
            .filter(ParcelORM.tournee_id == tour_id, ParcelORM.actif == 1)
            .order_by(ParcelORM.id.asc())
            .all()
        )

        parcel_uc = ParcelUseCases(self.db)
        parcel_dtos = [parcel_uc._to_response_dto(self.parcel_repo._to_domain(po)) for po in parcel_orms]

        courier_phone_vo = PhoneNumber(courier_orm.telephone) if courier_orm and courier_orm.telephone else None

        # Dynamically calculate theoretical total for live tour to reflect real-time status of parcels
        domain_tour = self.tour_repo._to_domain(tour_orm)
        domain_tour.parcels = [self.parcel_repo._to_domain(po) for po in parcel_orms]
        if tour_orm.statut != TourStatus.CLOTURE.value:
            theor_amount = domain_tour.calculate_theoretical_total().amount
            if tour_orm.total_theorique_caisse != theor_amount:
                tour_orm.total_theorique_caisse = theor_amount
                self.db.commit()
        else:
            theor_amount = int(tour_orm.total_theorique_caisse)

        expenses_amount = int(getattr(tour_orm, "total_depenses", 0.0) or 0)
        expenses_reason = getattr(tour_orm, "motif_depenses", None)
        discrepancy = int((tour_orm.total_reel_verse + expenses_amount) - theor_amount)
        return TourDetailResponseDTO(
            id=tour_orm.id,
            tour_date=tour_orm.date_tournee,
            courier_id=tour_orm.livreur_id,
            status=tour_orm.statut,
            theoretical_total=theor_amount,
            actual_remitted=int(tour_orm.total_reel_verse),
            discrepancy=discrepancy,
            expenses_amount=expenses_amount,
            expenses_reason=expenses_reason,
            closed_at=tour_orm.cloture_a.isoformat() if tour_orm.cloture_a else None,
            courier_name=courier_orm.nom if courier_orm else None,
            courier_phone=courier_orm.telephone if courier_orm else None,
            courier_phone_formatted=courier_phone_vo.formatted if courier_phone_vo else None,
            courier_vehicle=courier_orm.type_vehicule if courier_orm else None,
            parcels_count=len(parcel_dtos),
            parcels=parcel_dtos,
        )

    def unassign_parcel(self, tour_id: int, parcel_id: int) -> TourDetailResponseDTO:
        tour = self.tour_repo.get_by_id(tour_id)
        if not tour:
            raise BusinessRuleViolationException(f"Tournée introuvable (ID: {tour_id})")

        p = self.parcel_repo.get_by_id(parcel_id)
        if not p:
            raise BusinessRuleViolationException(f"Colis introuvable (ID: {parcel_id})")

        if p.tour_id != tour_id:
            raise BusinessRuleViolationException("Ce colis n'appartient pas à cette tournée.")

        old_status = p.status
        p.unassign()
        self.parcel_repo.save(p)

        history = ParcelStatusHistoryORM(
            colis_id=p.id,
            statut_precedent=old_status.value,
            statut_nouveau=ParcelStatus.EN_DEPOT.value,
            motif=f"Désassigné de la tournée #{tour_id} et réintégré au stock",
            horodatage=datetime.utcnow(),
        )
        self.db.add(history)
        self.db.commit()

        # Refresh tour parcels
        tour_parcels = self.db.query(ParcelORM).filter(ParcelORM.tournee_id == tour.id, ParcelORM.actif == 1).all()
        tour.parcels = [self.parcel_repo._to_domain(po) for po in tour_parcels]
        tour.calculate_theoretical_total()
        self.tour_repo.save(tour)

        return self.get_tour_detail(tour_id)

    def start_tour(self, tour_id: int) -> TourDetailResponseDTO:
        tour = self.tour_repo.get_by_id(tour_id)
        if not tour:
            raise BusinessRuleViolationException(f"Tournée introuvable (ID: {tour_id})")

        tour.status = TourStatus.EN_COURS
        self.tour_repo.save(tour)

        # Update all assigned parcels to EN_COURS
        parcel_orms = self.db.query(ParcelORM).filter(
            ParcelORM.tournee_id == tour_id,
            ParcelORM.statut == ParcelStatus.ASSIGNE.value,
            ParcelORM.actif == 1,
        ).all()
        for po in parcel_orms:
            po.statut = ParcelStatus.EN_COURS.value
            history = ParcelStatusHistoryORM(
                colis_id=po.id,
                statut_precedent=ParcelStatus.ASSIGNE.value,
                statut_nouveau=ParcelStatus.EN_COURS.value,
                motif="Départ en tournée de distribution",
                horodatage=datetime.utcnow(),
            )
            self.db.add(history)
        self.db.commit()

        return self.get_tour_detail(tour_id)

    def close_tour(self, tour_id: int, dto: CloseTourDTO) -> TourResponseDTO:
        tour = self.tour_repo.get_by_id(tour_id)
        if not tour:
            raise BusinessRuleViolationException(f"Tournée introuvable (ID: {tour_id})")

        # Load delivered / handled parcels
        delivered_orms = self.db.query(ParcelORM).filter(
            ParcelORM.tournee_id == tour_id,
            ParcelORM.statut.in_([
                ParcelStatus.LIVRE.value,
                ParcelStatus.ENCAISSE.value,
                ParcelStatus.LIVRE_ENCAISSE.value,
                ParcelStatus.CLOTURE_CAISSE.value,
                ParcelStatus.SOUS_TRAITE.value,
            ]),
        ).all()
        tour.parcels = [self.parcel_repo._to_domain(po) for po in delivered_orms]
        theor = tour.calculate_theoretical_total()

        # Règle Métier 7 : Séparation stricte Litiges vs Dépenses d'exploitation
        if dto.cash_amount is not None or dto.mobile_amount is not None:
            actual_cash_and_mobile = (dto.cash_amount or 0) + (dto.mobile_amount or 0)
        elif dto.cash_and_mobile_remitted is not None:
            actual_cash_and_mobile = dto.cash_and_mobile_remitted
        else:
            actual_cash_and_mobile = 0

        remitted = Money(actual_cash_and_mobile)
        expenses = Money(dto.expenses_amount or 0)
        expenses_reason = (dto.expenses_reason or "").strip() or None
        if expenses.amount > 0 and not expenses_reason:
            raise BusinessRuleViolationException(
                "Le motif des dépenses d'exploitation est obligatoire (ex : carburant, stationnement)."
            )
        if expenses.amount == 0:
            expenses_reason = None

        discrepancy = tour.compute_cash_discrepancy(remitted, expenses, expenses_reason)

        # Si déficit net (< 0), ouvrir automatiquement un litige UNIQUEMENT sur le déficit non justifié.
        # Les dépenses de carburant et frais justifiés ne doivent JAMAIS être comptabilisées comme un litige (Priorité 7).
        if discrepancy < 0:
            deficit_amount = abs(discrepancy)
            ref = self.dispute_repo.generate_next_litige_ref()
            debt_reason = f"Déficit net de caisse de {deficit_amount} Ar lors de la clôture de la tournée #{tour.id}"
            if expenses.amount > 0:
                debt_reason += f" (Dépenses d'exploitation déduites : {expenses.amount} Ar)"
            debt = CourierDebt(
                reference_litige=ref,
                livreur_id=tour.courier_id,
                incident_type=IncidentType.DEFICIT_COD,
                initial_amount=Money(deficit_amount),
                reason=debt_reason,
                incident_date=tour.tour_date,
                tournee_id=tour.id,
            )
            self.dispute_repo.save(debt)

        # Mark parcels as CLOTURE_CAISSE
        for po in delivered_orms:
            old_statut = po.statut
            po.statut = ParcelStatus.CLOTURE_CAISSE.value
            self.db.add(
                ParcelStatusHistoryORM(
                    colis_id=po.id,
                    statut_precedent=old_statut,
                    statut_nouveau=ParcelStatus.CLOTURE_CAISSE.value,
                    motif=f"Décharge caisse et clôture comptable de la tournée #{tour.id}",
                    horodatage=datetime.now(timezone.utc),
                )
            )

        # Reintegrate REPORTE parcels to Hub stock (EN_DEPOT) (CDC section 8.1)
        reported_orms = self.db.query(ParcelORM).filter(
            ParcelORM.tournee_id == tour_id,
            ParcelORM.statut == ParcelStatus.REPORTE.value,
            ParcelORM.actif == 1,
        ).all()
        for po in reported_orms:
            old_statut = po.statut
            po.statut = ParcelStatus.EN_DEPOT.value
            self.db.add(
                ParcelStatusHistoryORM(
                    colis_id=po.id,
                    statut_precedent=old_statut,
                    statut_nouveau=ParcelStatus.EN_DEPOT.value,
                    motif=f"Retour au Hub Central et réintégration en stock (Clôture tournée #{tour.id})",
                    horodatage=datetime.now(timezone.utc),
                )
            )

        self.db.commit()

        tour.status = TourStatus.CLOTURE
        tour.closed_at = datetime.now(timezone.utc)
        tour.actual_remitted = remitted
        tour.expenses_amount = expenses
        tour.expenses_reason = expenses_reason
        tour.theoretical_total = theor
        saved = self.tour_repo.save(tour)
        return self._to_tour_dto(saved)


class DisputeUseCases:
    def __init__(self, db: Session):
        self.db = db
        self.repo = PostgresDisputeRepository(db)

    def _to_dispute_dto(self, d: CourierDebt) -> DisputeResponseDTO:
        courier = self.db.query(CourierORM).filter(CourierORM.id == d.livreur_id).first()
        livreur_name = courier.nom if courier else f"Livreur #{d.livreur_id}"
        return DisputeResponseDTO(
            id=d.id,
            reference_litige=d.reference_litige,
            livreur_id=d.livreur_id,
            colis_id=d.colis_id,
            tournee_id=d.tournee_id,
            incident_type=d.incident_type.value,
            initial_amount=d.initial_amount.amount,
            refunded_amount=d.refunded_amount.amount,
            remaining_balance=d.remaining_balance.amount,
            status=d.status.value,
            reason=d.reason,
            incident_date=d.incident_date,
            closure_date=d.closure_date,
            livreur_name=livreur_name,
        )

    def create_dispute(self, dto: CreateDisputeDTO) -> DisputeResponseDTO:
        ref = self.repo.generate_next_litige_ref()
        debt = CourierDebt.open_new(
            reference_litige=ref,
            livreur_id=dto.livreur_id,
            colis_id=dto.colis_id,
            tournee_id=dto.tournee_id,
            incident_type=IncidentType(dto.incident_type),
            initial_amount=Money(dto.initial_amount),
            reason=dto.reason,
            incident_date=dto.incident_date,
        )
        saved = self.repo.save(debt)
        return self._to_dispute_dto(saved)

    def repay_debt(self, debt_id: int, dto: RepayDebtDTO, user_id: Optional[int] = None) -> DisputeResponseDTO:
        debt = self.repo.get_by_id(debt_id)
        if not debt:
            raise BusinessRuleViolationException(f"Dossier de litige introuvable (ID: {debt_id})")

        amount = Money(dto.amount)
        debt.record_repayment(amount, dto.closure_date)
        saved = self.repo.save(debt)

        # Record repayment in audit table
        rep = DebtRepaymentORM(
            dette_id=debt.id,
            utilisateur_validateur_id=user_id,
            montant_verse=float(amount.amount),
            mode_remboursement=dto.mode or "COMPTANT",
            reference_piece_comptable=f"REC-{saved.reference_litige}-{int(datetime.now().timestamp())}",
            horodatage=datetime.utcnow(),
        )
        self.db.add(rep)
        self.db.commit()

        return self._to_dispute_dto(saved)

    def cancel_under_force_majeure(self, debt_id: int, police_report: str) -> DisputeResponseDTO:
        debt = self.repo.get_by_id(debt_id)
        if not debt:
            raise BusinessRuleViolationException(f"Dossier de litige introuvable (ID: {debt_id})")

        debt.cancel_under_force_majeure(police_report)
        saved = self.repo.save(debt)
        return self._to_dispute_dto(saved)


class CourierUseCases:
    def __init__(self, db: Session):
        self.db = db
        self.repo = PostgresCourierRepository(db)

    def _to_courier_dto(self, c: Courier) -> CourierResponseDTO:
        from datetime import date
        today_str = date.today().isoformat()

        today_parcels = self.db.query(ParcelORM).filter(
            ParcelORM.livreur_id == c.id,
            ParcelORM.date_reception == today_str,
            ParcelORM.actif == 1,
        ).count()

        active_tour = self.db.query(TourORM).filter(
            TourORM.livreur_id == c.id,
            TourORM.statut == "EN_COURS",
        ).first()

        disputes_count = self.db.query(CourierDebtORM).filter(
            CourierDebtORM.livreur_id == c.id,
            CourierDebtORM.statut_dette.in_(["OUVERTE", "EN_COURS"]),
        ).count()

        return CourierResponseDTO(
            id=c.id,
            name=c.name,
            phone=c.phone.raw_digits,
            phone_formatted=c.phone.formatted,
            vehicle_type=c.vehicle_type,
            security_deposit=c.security_deposit.amount,
            security_deposit_formatted=c.security_deposit.formatted,
            max_parcels=c.max_parcels,
            assigned_axis=c.assigned_axis,
            active=c.active,
            today_parcels_count=today_parcels,
            active_tour_id=active_tour.id if active_tour else None,
            disputes_count=disputes_count,
        )

    def create_courier(self, dto: CreateCourierDTO) -> CourierResponseDTO:
        c = Courier(
            name=dto.name,
            phone=PhoneNumber(dto.phone),
            vehicle_type=dto.vehicle_type,
            security_deposit=Money(dto.security_deposit),
            max_parcels=min(dto.max_parcels or 30, 30),
            assigned_axis=dto.assigned_axis,
        )
        saved = self.repo.save(c)
        return self._to_courier_dto(saved)

    def update_courier_profile(self, courier_id: int, dto: UpdateCourierProfileDTO, is_admin: bool) -> CourierResponseDTO:
        c = self.repo.get_by_id(courier_id)
        if not c:
            raise NotFoundException(f"Livreur introuvable (ID: {courier_id})")

        if not is_admin:
            # Superviseur is restricted to operational updates only
            sensitive_fields_modified = (
                dto.name is not None
                or dto.phone is not None
                or dto.vehicle_type is not None
                or dto.security_deposit is not None
                or dto.active is not None
            )
            if sensitive_fields_modified:
                raise BusinessRuleViolationException(
                    "Le rôle SUPERVISEUR ne peut modifier que l'axe et la capacité maximale quotidienne. "
                    "La modification des données contractuelles et financières est strictement réservée au SUPER_ADMIN."
                )

        if dto.name is not None:
            c.name = dto.name.strip()
        if dto.phone is not None:
            c.phone = PhoneNumber(dto.phone)
        if dto.vehicle_type is not None:
            c.vehicle_type = dto.vehicle_type.strip()
        if dto.security_deposit is not None:
            c.security_deposit = Money(dto.security_deposit)
        if dto.max_parcels is not None:
            c.set_max_parcels(dto.max_parcels)
        if dto.assigned_axis is not None:
            c.set_assigned_axis(dto.assigned_axis if dto.assigned_axis != "NONE" else None)
        if dto.active is not None:
            c.active = dto.active

        saved = self.repo.save(c)
        return self._to_courier_dto(saved)

    def toggle_courier_active(self, courier_id: int, is_admin: bool) -> CourierResponseDTO:
        if not is_admin:
            raise BusinessRuleViolationException("Seul le Super Admin (Direction) peut activer ou désactiver un livreur.")
        c = self.repo.get_by_id(courier_id)
        if not c:
            raise NotFoundException(f"Livreur introuvable (ID: {courier_id})")
        if c.active:
            # Check for active tour
            active_tour = self.db.query(TourORM).filter(
                TourORM.livreur_id == courier_id,
                TourORM.statut == "EN_COURS",
            ).first()
            if active_tour:
                raise BusinessRuleViolationException("Impossible de désactiver un livreur ayant une tournée en cours de livraison.")
            c.deactivate()
        else:
            c.activate()
        saved = self.repo.save(c)
        return self._to_courier_dto(saved)

    def delete_courier(self, courier_id: int, is_admin: bool) -> bool:
        if not is_admin:
            raise BusinessRuleViolationException("Seul le Super Admin (Direction) peut archiver ou supprimer un livreur.")
        c = self.repo.get_by_id(courier_id)
        if not c:
            raise NotFoundException(f"Livreur introuvable (ID: {courier_id})")
        active_tour = self.db.query(TourORM).filter(
            TourORM.livreur_id == courier_id,
            TourORM.statut == "EN_COURS",
        ).first()
        if active_tour:
            raise BusinessRuleViolationException("Impossible d'archiver un livreur ayant une tournée active en cours.")
        return self.repo.delete(courier_id)

    def update_courier_capacity(self, courier_id: int, max_parcels: int) -> CourierResponseDTO:
        c = self.repo.get_by_id(courier_id)
        if not c:
            raise NotFoundException(f"Livreur introuvable (ID: {courier_id})")
        c.set_max_parcels(max_parcels)
        saved = self.repo.save(c)
        return self._to_courier_dto(saved)

    def update_courier_axis(self, courier_id: int, axis: Optional[str]) -> CourierResponseDTO:
        c = self.repo.get_by_id(courier_id)
        if not c:
            raise NotFoundException(f"Livreur introuvable (ID: {courier_id})")
        c.set_assigned_axis(axis)
        saved = self.repo.save(c)
        return self._to_courier_dto(saved)

    def list_couriers(self, axis: Optional[str] = None, include_inactive: bool = False) -> List[CourierResponseDTO]:
        couriers = self.repo.list_all(active_only=not include_inactive)
        if axis and axis != "ALL":
            couriers = [c for c in couriers if c.assigned_axis == axis]
        return [self._to_courier_dto(c) for c in couriers]

    def compute_scorecard(self, livreur_id: int, period: str) -> ScorecardResponseDTO:
        # Load stats for courier in period (YYYY-MM)
        parcels = self.db.query(ParcelORM).filter(
            ParcelORM.livreur_id == livreur_id,
            ParcelORM.date_reception.startswith(period),
            ParcelORM.actif == 1,
        ).all()

        total_assigned = len(parcels)
        total_delivered = sum(
            1 for p in parcels
            if p.statut in ["LIVRE", "ENCAISSE", "LIVRE_ENCAISSE", "CLOTURE_CAISSE"]
        )
        # Assume punctuality rate is aligned with delivered minus reports
        total_on_time = max(0, total_delivered - sum(1 for p in parcels if p.date_report))

        disputes_count = self.db.query(CourierDebtORM).filter(
            CourierDebtORM.livreur_id == livreur_id,
            CourierDebtORM.date_incident.startswith(period),
        ).count()

        tours = self.db.query(TourORM).filter(
            TourORM.livreur_id == livreur_id,
            TourORM.date_tournee.startswith(period),
        ).all()
        total_days = len(tours) or 1
        perfect_cash_days = sum(1 for t in tours if abs(t.ecart_constate) < 0.01)

        result = ScorecardEngine.calculate(
            livreur_id=livreur_id,
            period=period,
            total_assigned=total_assigned,
            total_delivered=total_delivered,
            total_on_time=total_on_time,
            total_disputes=disputes_count,
            total_days_worked=total_days,
            total_days_perfect_cash=perfect_cash_days,
        )

        # Cache/persist evaluation in evaluations_performance
        eval_orm = self.db.query(PerformanceEvaluationORM).filter(
            PerformanceEvaluationORM.livreur_id == livreur_id,
            PerformanceEvaluationORM.mois == period,
        ).first()

        if not eval_orm:
            eval_orm = PerformanceEvaluationORM(
                livreur_id=livreur_id,
                mois=period,
                total_assignes=result.total_assigned,
                total_livres=result.total_delivered,
                taux_succes=result.success_rate,
                taux_ponctualite=result.punctuality_rate,
                taux_qualite=result.quality_rate,
                score_global=result.global_score,
                palier=result.tier.value,
                montant_prime=float(result.bonus_amount.amount),
                calcule_a=datetime.utcnow(),
            )
            self.db.add(eval_orm)
        else:
            eval_orm.total_assignes = result.total_assigned
            eval_orm.total_livres = result.total_delivered
            eval_orm.taux_succes = result.success_rate
            eval_orm.taux_ponctualite = result.punctuality_rate
            eval_orm.taux_qualite = result.quality_rate
            eval_orm.score_global = result.global_score
            eval_orm.palier = result.tier.value
            eval_orm.montant_prime = float(result.bonus_amount.amount)
            eval_orm.calcule_a = datetime.utcnow()
        self.db.commit()

        courier = self.repo.get_by_id(result.livreur_id)
        courier_name = courier.name if courier else f"Livreur #{result.livreur_id}"

        return ScorecardResponseDTO(
            livreur_id=result.livreur_id,
            courier_name=courier_name,
            period=result.period,
            total_assigned=result.total_assigned,
            total_delivered=result.total_delivered,
            success_rate=result.success_rate,
            punctuality_rate=result.punctuality_rate,
            quality_rate=result.quality_rate,
            cash_rigor_rate=result.cash_rigor_rate,
            global_score=result.global_score,
            tier=result.tier.value,
            bonus_amount=result.bonus_amount.amount,
            bonus_formatted=result.bonus_amount.formatted,
        )

    def compute_fleet_leaderboard(self, period: str) -> List[ScorecardResponseDTO]:
        couriers = self.repo.list_all()
        scorecards = [self.compute_scorecard(c.id, period) for c in couriers if c.active]
        scorecards.sort(key=lambda s: s.global_score, reverse=True)
        return scorecards
