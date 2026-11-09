"""Parcel Application Use Cases according to Clean Architecture."""

from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.application.dtos.parcel_dtos import (
    CreateBatchParcelDTO,
    CreateParcelDTO,
    MarkPrepaidDTO,
    ParcelResponseDTO,
    UpdateParcelStatusDTO,
)
from backend.app.domain.exceptions import (
    BusinessRuleViolationException,
    DomainException,
)
from backend.app.domain.models.parcel import FluxType, Parcel
from backend.app.domain.models.vendor import SenderType
from backend.app.domain.services.axis_detector import AxisAutoDetector
from backend.app.domain.state_machine.parcel_fsm import (
    ParcelStateMachine,
    ParcelStatus,
    PaymentMethod,
    TransitionContext,
)
from backend.app.domain.value_objects.axis import LogisticAxis
from backend.app.domain.value_objects.money import Money
from backend.app.domain.value_objects.phone_number import PhoneNumber
from backend.app.infrastructure.persistence.models import ParcelORM, ParcelStatusHistoryORM
from backend.app.infrastructure.persistence.repositories import PostgresParcelRepository


class ParcelUseCases:
    def __init__(self, db: Session):
        self.db = db
        self.repo = PostgresParcelRepository(db)

    def _to_response_dto(self, p: Parcel) -> ParcelResponseDTO:
        sender_phone_digits = p.sender_phone.raw_digits if p.sender_phone else None
        sender_phone_fmt = p.sender_phone.formatted if p.sender_phone else None
        sender_operator = p.sender_phone.operator.value if p.sender_phone else None
        return ParcelResponseDTO(
            id=p.id,
            tracking_number=p.tracking_number,
            reception_date=p.reception_date,
            vendor_id=p.vendor_id,
            sender_type=p.sender_type.value if hasattr(p.sender_type, "value") else str(p.sender_type),
            sender_name=p.sender_name,
            sender_phone=sender_phone_digits,
            sender_phone_formatted=sender_phone_fmt,
            sender_operator=sender_operator,
            sender_address=p.sender_address,
            recipient_name=p.recipient_name,
            recipient_phone=p.recipient_phone.raw_digits,
            recipient_phone_formatted=p.recipient_phone.formatted,
            operator=p.recipient_phone.operator.value,
            delivery_address=p.delivery_address,
            designation=p.designation,
            axis=p.axis.value,
            axis_label=p.axis.label,
            is_manual_axis=p.is_manual_axis,
            flux_type=p.flux_type.value,
            merchandise_amount=p.merchandise_amount.amount,
            delivery_fee=p.delivery_fee.amount,
            total_to_collect=p.total_to_collect.amount,
            total_to_collect_formatted=p.total_to_collect.formatted,
            partner_fee=p.partner_fee.amount,
            status=p.status.value,
            status_label=p.status.label,
            courier_id=p.courier_id,
            tour_id=p.tour_id,
            payment_method=p.payment_method.value if p.payment_method else None,
            reschedule_date=p.reschedule_date,
            incident_reason=p.incident_reason,
            partner_name=p.partner_name,
            partner_reference=p.partner_reference,
            driver_contact=p.driver_contact,
            vehicle_plate=p.vehicle_plate,
            remittance_id=p.remittance_id,
            remittance_status=p.remittance_status,
            observation=p.observation,
            active=p.active,
        )

    def create_parcel(self, dto: CreateParcelDTO) -> ParcelResponseDTO:
        # 1. Phone validation & parsing
        phone = PhoneNumber(dto.recipient_phone)

        # 2. Axis auto-detection or manual assignment
        if dto.axis:
            axis = LogisticAxis(dto.axis)
            is_manual_axis = True
        else:
            detection = AxisAutoDetector.detect(dto.delivery_address)
            axis = detection.axis
            is_manual_axis = False

        # 3. Next sequential BDR generation
        tracking_number = dto.tracking_number or self.repo.generate_next_bdr()
        reception_date = dto.reception_date or datetime.now().strftime("%Y-%m-%d")

        # 4. Sender validation
        sender_phone_vo = PhoneNumber(dto.sender_phone) if dto.sender_phone else None
        try:
            sender_type_enum = SenderType(dto.sender_type) if dto.sender_type else SenderType.CYBERMARCHAND
        except ValueError:
            sender_type_enum = SenderType.CYBERMARCHAND

        # 5. Domain entity creation with auto-calculated delivery fee if not specified
        final_fee = (
            dto.delivery_fee
            if (dto.delivery_fee is not None and dto.delivery_fee > 0)
            else AxisAutoDetector.detect_fee(dto.delivery_address)
        )

        parcel = Parcel(
            tracking_number=tracking_number,
            reception_date=reception_date,
            vendor_id=dto.vendor_id,
            sender_type=sender_type_enum,
            sender_name=dto.sender_name,
            sender_phone=sender_phone_vo,
            sender_address=dto.sender_address,
            recipient_name=dto.recipient_name,
            recipient_phone=phone,
            delivery_address=dto.delivery_address,
            designation=dto.designation,
            axis=axis,
            is_manual_axis=is_manual_axis,
            flux_type=FluxType(dto.flux_type),
            merchandise_amount=Money(dto.merchandise_amount),
            delivery_fee=Money(final_fee),
            observation=dto.observation,
        )

        saved = self.repo.save(parcel)
        return self._to_response_dto(saved)

    def create_batch(self, dto: CreateBatchParcelDTO) -> List[ParcelResponseDTO]:
        return [self.create_parcel(item) for item in dto.parcels]

    def update_status(
        self,
        parcel_id: int,
        dto: UpdateParcelStatusDTO,
        user_id: Optional[int] = None,
    ) -> ParcelResponseDTO:
        parcel = self.repo.get_by_id(parcel_id)
        if not parcel:
            raise BusinessRuleViolationException(f"Colis introuvable (ID: {parcel_id})")

        old_status = parcel.status
        target_status = ParcelStatus(dto.status)

        # Execute domain method according to target status
        if target_status == ParcelStatus.ASSIGNE:
            if not dto.courier_id:
                raise BusinessRuleViolationException("Coursier obligatoire pour l'assignation.")
            parcel.assign_to_courier(dto.courier_id, dto.tour_id)

        elif target_status == ParcelStatus.EN_COURS:
            parcel.start_delivery()

        elif target_status == ParcelStatus.LIVRE:
            if parcel.status == ParcelStatus.ASSIGNE:
                parcel.start_delivery()
            parcel.mark_as_delivered()

        elif target_status == ParcelStatus.ENCAISSE:
            if parcel.status == ParcelStatus.ASSIGNE:
                parcel.start_delivery()
            if not dto.payment_method:
                raise BusinessRuleViolationException("Mode de paiement obligatoire pour validation de l'encaissement.")
            parcel.mark_as_cashed(PaymentMethod(dto.payment_method))

        elif target_status == ParcelStatus.LIVRE_ENCAISSE:
            if parcel.status == ParcelStatus.ASSIGNE:
                parcel.start_delivery()
            if parcel.status == ParcelStatus.SOUS_TRAITE:
                parcel.confirm_province_pickup()
            else:
                if not dto.payment_method:
                    raise BusinessRuleViolationException("Mode de paiement obligatoire pour validation de livraison.")
                parcel.mark_as_delivered(PaymentMethod(dto.payment_method))

        elif target_status == ParcelStatus.REPORTE:
            if parcel.status == ParcelStatus.ASSIGNE:
                parcel.start_delivery()
            if not dto.reschedule_date or not dto.incident_reason:
                raise BusinessRuleViolationException("Date de report (YYYY-MM-DD) et motif obligatoires.")
            parcel.reschedule(dto.reschedule_date, dto.incident_reason)

        elif target_status == ParcelStatus.ANNULE_RETOUR:
            if parcel.status == ParcelStatus.ASSIGNE:
                parcel.start_delivery()
            if not dto.incident_reason:
                raise BusinessRuleViolationException("Motif d'annulation ou refus obligatoire.")
            parcel.cancel_and_return(dto.incident_reason)

        elif target_status == ParcelStatus.SOUS_TRAITE:
            if not dto.partner_name or not dto.partner_reference:
                raise BusinessRuleViolationException("Nom de la coopérative et récépissé obligatoires.")
            partner_fee = Money(dto.partner_fee or 0)
            parcel.outsource_to_province(
                dto.partner_name,
                dto.partner_reference,
                partner_fee,
                dto.driver_contact,
                dto.vehicle_plate,
            )

        elif target_status == ParcelStatus.EN_DEPOT:
            if old_status == ParcelStatus.ASSIGNE:
                parcel.unassign()
            elif old_status == ParcelStatus.REPORTE:
                parcel.reintegrate_to_hub()
            else:
                ParcelStateMachine.validate_transition(old_status, ParcelStatus.EN_DEPOT)
                parcel.status = ParcelStatus.EN_DEPOT

        elif target_status == ParcelStatus.RETOUR_BOUTIQUE:
            parcel.return_to_merchant()

        elif target_status == ParcelStatus.CLOTURE_CAISSE:
            parcel.close_in_cash()

        # Persist updated parcel
        saved = self.repo.save(parcel)

        # Record status audit log in colis_statut_historique (CDC section 12 & 14)
        history = ParcelStatusHistoryORM(
            colis_id=saved.id,
            utilisateur_id=user_id,
            statut_precedent=old_status.value,
            statut_nouveau=saved.status.value,
            motif=dto.incident_reason,
            horodatage=datetime.utcnow(),
        )
        self.db.add(history)
        self.db.commit()

        return self._to_response_dto(saved)

    def override_parcel_axis(self, parcel_id: int, new_axis: str) -> ParcelResponseDTO:
        parcel = self.repo.get_by_id(parcel_id)
        if not parcel:
            raise BusinessRuleViolationException(f"Colis introuvable (ID: {parcel_id})")

        target_axis = LogisticAxis(new_axis)
        parcel.override_axis(target_axis)
        saved = self.repo.save(parcel)
        return self._to_response_dto(saved)

    def update_parcel_contact(
        self,
        parcel_id: int,
        recipient_phone: Optional[str] = None,
        recipient_name: Optional[str] = None,
        delivery_address: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> ParcelResponseDTO:
        parcel = self.repo.get_by_id(parcel_id)
        if not parcel:
            raise BusinessRuleViolationException(f"Colis introuvable (ID: {parcel_id})")

        validated_phone = None
        notes = []
        if recipient_phone:
            validated_phone = PhoneNumber(recipient_phone)
            notes.append(f"Téléphone destinataire corrigé : {validated_phone.formatted}")
        if recipient_name and recipient_name.strip():
            notes.append(f"Nom destinataire : {recipient_name.strip()}")
        if delivery_address and delivery_address.strip():
            notes.append(f"Adresse : {delivery_address.strip()}")

        parcel.update_contact_info(
            recipient_phone=validated_phone,
            recipient_name=recipient_name,
            delivery_address=delivery_address,
        )
        saved = self.repo.save(parcel)

        if notes and user_id:
            audit = ParcelStatusHistoryORM(
                parcel_id=parcel.id,
                old_status=parcel.status.value,
                new_status=parcel.status.value,
                changed_by_user_id=user_id,
                reason=" • ".join(notes),
                horodatage=datetime.now(timezone.utc),
            )
            self.db.add(audit)
            self.db.commit()

        return self._to_response_dto(saved)

    def get_parcel(self, parcel_id: int) -> Optional[ParcelResponseDTO]:
        p = self.repo.get_by_id(parcel_id)
        return self._to_response_dto(p) if p else None

    def list_parcels(
        self,
        status: Optional[str] = None,
        axis: Optional[str] = None,
        date_str: Optional[str] = None,
        tour_id: Optional[int] = None,
    ) -> List[ParcelResponseDTO]:
        q = self.db.query(ParcelORM).filter(ParcelORM.actif == 1)
        if status:
            q = q.filter(ParcelORM.statut == status)
        if axis:
            q = q.filter(ParcelORM.axe == axis)
        if date_str:
            q = q.filter(ParcelORM.date_reception == date_str)
        if tour_id is not None:
            q = q.filter(ParcelORM.tournee_id == tour_id)

        orms = q.order_by(ParcelORM.id.desc()).all()
        parcels = [self.repo._to_domain(o) for o in orms]
        return [self._to_response_dto(p) for p in parcels]

    def reassign_parcel(
        self,
        parcel_id: int,
        courier_id: int,
        tour_id: Optional[int] = None,
        tour_date: Optional[str] = None,
        reason: Optional[str] = None,
        user_role: str = "SUPER_ADMIN",
        user_id: Optional[int] = None,
    ) -> ParcelResponseDTO:
        parcel = self.repo.get_by_id(parcel_id)
        if not parcel:
            raise BusinessRuleViolationException(f"Colis introuvable (ID: {parcel_id})")

        # RBAC Check according to CDC Section 3 & 8.1
        if parcel.status == ParcelStatus.EN_COURS:
            if user_role != "SUPER_ADMIN":
                raise BusinessRuleViolationException(
                    f"Le colis BDR-{parcel.tracking_number} est déjà en cours de livraison. "
                    f"Seul le Super Admin est habilité à effectuer une réassignation d'urgence."
                )
        elif parcel.status not in [ParcelStatus.EN_DEPOT, ParcelStatus.ASSIGNE, ParcelStatus.REPORTE]:
            raise BusinessRuleViolationException(
                f"Impossible de réassigner le colis BDR-{parcel.tracking_number} au statut '{parcel.status.value}'."
            )

        # Resolve or create target tour
        from backend.app.infrastructure.persistence.models import TourORM
        target_tour_id = tour_id
        if not target_tour_id:
            effective_date = tour_date or parcel.reception_date
            existing_tour = self.db.query(TourORM).filter(
                TourORM.livreur_id == courier_id,
                TourORM.date_tournee == effective_date,
            ).first()
            if existing_tour:
                target_tour_id = existing_tour.id
            else:
                new_tour = TourORM(
                    date_tournee=effective_date,
                    livreur_id=courier_id,
                    statut="ASSIGNE",
                    total_theorique_caisse=0,
                    total_reel_verse=0,
                )
                self.db.add(new_tour)
                self.db.commit()
                self.db.refresh(new_tour)
                target_tour_id = new_tour.id

        old_status = parcel.status
        old_courier_id = parcel.courier_id

        assignment_motif = (
            reason
            or (f"Réassignation d'urgence (Super Admin) vers le coursier #{courier_id}"
                if old_status == ParcelStatus.EN_COURS
                else f"Réassigné du coursier #{old_courier_id} vers le coursier #{courier_id}")
        )

        parcel.assign_to_courier(courier_id=courier_id, tour_id=target_tour_id, reason=assignment_motif)
        saved = self.repo.save(parcel)

        # Record audit trail
        history = ParcelStatusHistoryORM(
            colis_id=saved.id,
            utilisateur_id=user_id,
            statut_precedent=old_status.value,
            statut_nouveau=saved.status.value,
            motif=assignment_motif,
            horodatage=datetime.utcnow(),
        )
        self.db.add(history)

        # Recalculate totals on target tour
        from backend.app.infrastructure.persistence.repositories import PostgresTourRepository
        tour_repo = PostgresTourRepository(self.db)
        if target_tour_id:
            t = tour_repo.get_by_id(target_tour_id)
            if t:
                parcels_in_tour = self.db.query(ParcelORM).filter(ParcelORM.tournee_id == target_tour_id, ParcelORM.actif == 1).all()
                t.parcels = [self.repo._to_domain(po) for po in parcels_in_tour]
                t.calculate_theoretical_total()
                tour_repo.save(t)

        self.db.commit()
        return self._to_response_dto(saved)

    def mark_as_prepaid(
        self,
        parcel_id: int,
        dto: MarkPrepaidDTO,
        user_id: Optional[int] = None,
    ) -> ParcelResponseDTO:
        """Handle scenario where customer pays in advance to the headquarters or shop while parcel is in tour."""
        parcel = self.repo.get_by_id(parcel_id)
        if not parcel:
            raise BusinessRuleViolationException(f"Colis #{parcel_id} introuvable.")

        if parcel.status in (ParcelStatus.CLOTURE_CAISSE, ParcelStatus.RETOUR_BOUTIQUE):
            raise BusinessRuleViolationException(
                f"Impossible d'enregistrer un paiement anticipé pour un colis au statut '{parcel.status.value}'."
            )

        try:
            pm = PaymentMethod(dto.payment_method)
        except ValueError:
            pm = PaymentMethod.MVOLA

        parcel.mark_as_prepaid(
            prepaid_type=dto.prepaid_type,
            payment_method=pm,
            payment_reference=dto.payment_reference,
        )

        saved = self.repo.save(parcel)

        # Audit trail in status history
        motif_audit = f"Paiement anticipé ({dto.payment_method}): COD neutralisé ({dto.prepaid_type})"
        if dto.payment_reference:
            motif_audit += f" - Réf: {dto.payment_reference}"

        history = ParcelStatusHistoryORM(
            colis_id=saved.id,
            utilisateur_id=user_id,
            statut_precedent=parcel.status.value,
            statut_nouveau=saved.status.value,
            motif=motif_audit,
            horodatage=datetime.utcnow(),
        )
        self.db.add(history)

        # If parcel was assigned to a tour, update tour theoretical total
        if parcel.tour_id:
            from backend.app.infrastructure.persistence.repositories import PostgresTourRepository
            tour_repo = PostgresTourRepository(self.db)
            t = tour_repo.get_by_id(parcel.tour_id)
            if t:
                parcels_in_tour = self.db.query(ParcelORM).filter(ParcelORM.tournee_id == parcel.tour_id, ParcelORM.actif == 1).all()
                t.parcels = [self.repo._to_domain(po) for po in parcels_in_tour]
                t.calculate_theoretical_total()
                tour_repo.save(t)

        self.db.commit()
        return self._to_response_dto(saved)
