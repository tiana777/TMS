"""Parcel Application Use Cases according to Clean Architecture."""

from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.application.dtos.parcel_dtos import (
    CreateBatchParcelDTO,
    CreateParcelDTO,
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
from backend.app.infrastructure.persistence.models import ParcelStatusHistoryORM
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
            axis=p.axis.value,
            axis_label=p.axis.label,
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
            observation=p.observation,
            active=p.active,
        )

    def create_parcel(self, dto: CreateParcelDTO) -> ParcelResponseDTO:
        # 1. Phone validation & parsing
        phone = PhoneNumber(dto.recipient_phone)

        # 2. Axis auto-detection if not specified
        if dto.axis:
            axis = LogisticAxis(dto.axis)
        else:
            detection = AxisAutoDetector.detect(dto.delivery_address)
            axis = detection.axis

        # 3. Next sequential BDR generation
        tracking_number = dto.tracking_number or self.repo.generate_next_bdr()
        reception_date = dto.reception_date or datetime.now().strftime("%Y-%m-%d")

        # 4. Sender validation
        sender_phone_vo = PhoneNumber(dto.sender_phone) if dto.sender_phone else None
        try:
            sender_type_enum = SenderType(dto.sender_type) if dto.sender_type else SenderType.CYBERMARCHAND
        except ValueError:
            sender_type_enum = SenderType.CYBERMARCHAND

        # 5. Domain entity creation
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
            axis=axis,
            flux_type=FluxType(dto.flux_type),
            merchandise_amount=Money(dto.merchandise_amount),
            delivery_fee=Money(dto.delivery_fee),
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

        elif target_status == ParcelStatus.LIVRE_ENCAISSE:
            if parcel.status == ParcelStatus.SOUS_TRAITE:
                parcel.confirm_province_pickup()
            else:
                if not dto.payment_method:
                    raise BusinessRuleViolationException("Mode de paiement obligatoire pour validation de livraison.")
                parcel.mark_as_delivered(PaymentMethod(dto.payment_method))

        elif target_status == ParcelStatus.REPORTE:
            if not dto.reschedule_date or not dto.incident_reason:
                raise BusinessRuleViolationException("Date de report (YYYY-MM-DD) et motif obligatoires.")
            parcel.reschedule(dto.reschedule_date, dto.incident_reason)

        elif target_status == ParcelStatus.ANNULE_RETOUR:
            if not dto.incident_reason:
                raise BusinessRuleViolationException("Motif d'annulation ou refus obligatoire.")
            parcel.cancel_and_return(dto.incident_reason)

        elif target_status == ParcelStatus.SOUS_TRAITE:
            if not dto.partner_name or not dto.partner_reference:
                raise BusinessRuleViolationException("Nom de la coopérative et récépissé obligatoires.")
            partner_fee = Money(dto.partner_fee or 0)
            parcel.outsource_to_province(dto.partner_name, dto.partner_reference, partner_fee)

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

    def get_parcel(self, parcel_id: int) -> Optional[ParcelResponseDTO]:
        p = self.repo.get_by_id(parcel_id)
        return self._to_response_dto(p) if p else None

    def list_parcels(
        self,
        status: Optional[str] = None,
        axis: Optional[str] = None,
        date_str: Optional[str] = None,
    ) -> List[ParcelResponseDTO]:
        if status:
            parcels = self.repo.list_by_status(ParcelStatus(status))
        elif axis:
            parcels = self.repo.list_by_axis(LogisticAxis(axis))
        elif date_str:
            parcels = self.repo.list_by_date(date_str)
        else:
            today = datetime.now().strftime("%Y-%m-%d")
            parcels = self.repo.list_by_date(today)
            if not parcels:
                # If no parcels today, return all active parcels
                from backend.app.infrastructure.persistence.models import ParcelORM
                orms = self.db.query(ParcelORM).filter(ParcelORM.actif == 1).order_by(ParcelORM.id.desc()).all()
                parcels = [self.repo._to_domain(o) for o in orms]

        return [self._to_response_dto(p) for p in parcels]
