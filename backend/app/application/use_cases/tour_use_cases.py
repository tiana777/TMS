"""Tour, Courier, and Dispute Application Use Cases."""

from datetime import datetime
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
)
from backend.app.domain.exceptions import BusinessRuleViolationException
from backend.app.domain.models.courier import Courier
from backend.app.domain.models.dispute import CourierDebt, IncidentType
from backend.app.domain.models.tour import Tour, TourStatus
from backend.app.domain.services.scorecard_engine import ScorecardEngine
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
        self.dispute_repo = PostgresDisputeRepository(db)

    def _to_tour_dto(self, t: Tour) -> TourResponseDTO:
        discrepancy = t.actual_remitted.amount - t.theoretical_total.amount
        return TourResponseDTO(
            id=t.id,
            tour_date=t.tour_date,
            courier_id=t.courier_id,
            status=t.status.value,
            theoretical_total=t.theoretical_total.amount,
            actual_remitted=t.actual_remitted.amount,
            discrepancy=discrepancy,
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
        # Check if tour exists for courier and date
        existing = self.tour_repo.get_by_courier_and_date(courier_id, tour_date)
        if existing:
            tour = existing
        else:
            tour = Tour(
                tour_date=tour_date,
                courier_id=courier_id,
                status=TourStatus.ASSIGNE,
            )
            tour = self.tour_repo.save(tour)

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

        discrepancy = int(tour_orm.total_reel_verse - tour_orm.total_theorique_caisse)
        return TourDetailResponseDTO(
            id=tour_orm.id,
            tour_date=tour_orm.date_tournee,
            courier_id=tour_orm.livreur_id,
            status=tour_orm.statut,
            theoretical_total=int(tour_orm.total_theorique_caisse),
            actual_remitted=int(tour_orm.total_reel_verse),
            discrepancy=discrepancy,
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

        # Load delivered parcels
        delivered_orms = self.db.query(ParcelORM).filter(
            ParcelORM.tournee_id == tour_id,
            ParcelORM.statut.in_([
                ParcelStatus.LIVRE.value,
                ParcelStatus.ENCAISSE.value,
                ParcelStatus.LIVRE_ENCAISSE.value,
            ]),
        ).all()
        tour.parcels = [self.parcel_repo._to_domain(po) for po in delivered_orms]
        theor = tour.calculate_theoretical_total()
        remitted = Money(dto.cash_and_mobile_remitted)
        discrepancy = tour.compute_cash_discrepancy(remitted)

        # If deficit (< 0), automatically open a dispute (CDC section 11 & 13.1)
        if discrepancy < 0:
            deficit_amount = abs(discrepancy)
            ref = self.dispute_repo.generate_next_litige_ref()
            debt = CourierDebt(
                reference_litige=ref,
                livreur_id=tour.courier_id,
                incident_type=IncidentType.DEFICIT_COD,
                initial_amount=Money(deficit_amount),
                reason=f"Déficit de caisse de {deficit_amount} Ar lors de la clôture de la tournée #{tour.id}",
                incident_date=tour.tour_date,
                tournee_id=tour.id,
            )
            self.dispute_repo.save(debt)

        # Mark parcels as CLOTURE_CAISSE
        for po in delivered_orms:
            po.statut = ParcelStatus.CLOTURE_CAISSE.value
        self.db.commit()

        tour.status = TourStatus.CLOTURE
        tour.closed_at = datetime.utcnow()
        saved = self.tour_repo.save(tour)
        return self._to_tour_dto(saved)


class DisputeUseCases:
    def __init__(self, db: Session):
        self.db = db
        self.repo = PostgresDisputeRepository(db)

    def _to_dispute_dto(self, d: CourierDebt) -> DisputeResponseDTO:
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
        )

    def create_dispute(self, dto: CreateDisputeDTO) -> DisputeResponseDTO:
        ref = self.repo.generate_next_litige_ref()
        debt = CourierDebt(
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
            mode_remboursement="COMPTANT",
            reference_piece_comptable=f"REC-{saved.reference_litige}-{int(datetime.now().timestamp())}",
            horodatage=datetime.utcnow(),
        )
        self.db.add(rep)
        self.db.commit()

        return self._to_dispute_dto(saved)


class CourierUseCases:
    def __init__(self, db: Session):
        self.db = db
        self.repo = PostgresCourierRepository(db)

    def _to_courier_dto(self, c: Courier) -> CourierResponseDTO:
        return CourierResponseDTO(
            id=c.id,
            name=c.name,
            phone=c.phone.raw_digits,
            phone_formatted=c.phone.formatted,
            vehicle_type=c.vehicle_type,
            security_deposit=c.security_deposit.amount,
            security_deposit_formatted=c.security_deposit.formatted,
            active=c.active,
        )

    def create_courier(self, dto: CreateCourierDTO) -> CourierResponseDTO:
        c = Courier(
            name=dto.name,
            phone=PhoneNumber(dto.phone),
            vehicle_type=dto.vehicle_type,
            security_deposit=Money(dto.security_deposit),
        )
        saved = self.repo.save(c)
        return self._to_courier_dto(saved)

    def list_couriers(self) -> List[CourierResponseDTO]:
        return [self._to_courier_dto(c) for c in self.repo.list_all()]

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

        return ScorecardResponseDTO(
            livreur_id=result.livreur_id,
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
