"""Parcel Application Use Cases according to Clean Architecture."""

from datetime import datetime
from typing import List, Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session
from backend.app.application.dtos.parcel_dtos import (
    CreateBatchParcelDTO,
    CreateParcelDTO,
    MarkPrepaidDTO,
    ParcelHistoryItemDTO,
    ParcelResponseDTO,
    UpdateParcelStatusDTO,
)
from backend.app.domain.exceptions import (
    BusinessRuleViolationException,
    DomainException,
)
from backend.app.domain.models.parcel import FluxType, Parcel
from backend.app.domain.models.vendor import SenderType
from backend.app.domain.services.axis_detector import AxisAutoDetector, get_axis_for_gare
from backend.app.domain.state_machine.parcel_fsm import (
    ParcelStateMachine,
    ParcelStatus,
    PaymentMethod,
    TransitionContext,
)
from backend.app.domain.value_objects.axis import LogisticAxis
from backend.app.domain.value_objects.money import Money
from backend.app.domain.value_objects.phone_number import PhoneNumber
from backend.app.infrastructure.persistence.models import ParcelORM, ParcelStatusHistoryORM, AxisORM, TourORM, UserORM
from backend.app.infrastructure.persistence.repositories import PostgresParcelRepository


class ParcelUseCases:
    def __init__(self, db: Session):
        self.db = db
        self.repo = PostgresParcelRepository(db)

    def _to_response_dto(self, p: Parcel, include_history: bool = False) -> ParcelResponseDTO:
        sender_phone_digits = p.sender_phone.raw_digits if p.sender_phone else None
        sender_phone_fmt = p.sender_phone.formatted if p.sender_phone else None
        sender_operator = p.sender_phone.operator.value if p.sender_phone else None

        historique_items = []
        if include_history and p.id:
            historique_items = self.get_parcel_history(p.id)

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
            encaissement_lieu=p.encaissement_lieu or "LIVREUR",
            frais_prepayes_vendeur=bool(getattr(p, "frais_prepayes_vendeur", False)),
            repartition_vendeur=p.repartition_vendeur,
            montant_encaisse_livreur=p.montant_encaisse_livreur.amount if p.montant_encaisse_livreur else None,
            montant_encaisse_vendeur=p.montant_encaisse_vendeur.amount if p.montant_encaisse_vendeur else None,
            remittance_id=p.remittance_id,
            remittance_status=p.remittance_status,
            receptionniste_id=p.receptionniste_id,
            receptionniste_nom=p.receptionniste_nom,
            dernier_agent_id=p.dernier_agent_id,
            dernier_agent_nom=p.dernier_agent_nom,
            derniere_action=p.derniere_action,
            derniere_action_at=p.derniere_action_at.strftime("%d/%m/%Y %H:%M:%S") if p.derniere_action_at else None,
            observation=p.observation,
            active=p.active,
            historique=historique_items,
        )

    def record_history(
        self,
        colis_id: int,
        action: str,
        user_id: Optional[int] = None,
        user_nom: Optional[str] = None,
        user_role: Optional[str] = None,
        statut_precedent: Optional[str] = None,
        statut_nouveau: Optional[str] = None,
        motif: Optional[str] = None,
        details: Optional[str] = None,
        parcel_domain: Optional[Parcel] = None,
    ):
        if not user_nom and user_id:
            u = self.db.query(UserORM).filter(UserORM.id == user_id).first()
            if u:
                user_nom = u.nom_complet
                if not user_role:
                    user_role = u.role

        now = datetime.utcnow()
        history = ParcelStatusHistoryORM(
            colis_id=colis_id,
            utilisateur_id=user_id,
            action=action,
            agent_nom=user_nom,
            agent_role=user_role,
            statut_precedent=statut_precedent,
            statut_nouveau=statut_nouveau,
            motif=motif,
            details=details,
            horodatage=now,
        )
        self.db.add(history)

        orm = self.db.query(ParcelORM).filter(ParcelORM.id == colis_id).first()
        if orm:
            if user_id:
                orm.dernier_agent_id = user_id
            if user_nom:
                orm.dernier_agent_nom = user_nom
            orm.derniere_action = details or action
            orm.derniere_action_at = now

        if parcel_domain:
            if user_id:
                parcel_domain.dernier_agent_id = user_id
            if user_nom:
                parcel_domain.dernier_agent_nom = user_nom
            parcel_domain.derniere_action = details or action
            parcel_domain.derniere_action_at = now

        self.db.commit()

    def get_parcel_history(self, parcel_id: int) -> List[ParcelHistoryItemDTO]:
        items = (
            self.db.query(ParcelStatusHistoryORM)
            .filter(ParcelStatusHistoryORM.colis_id == parcel_id)
            .order_by(ParcelStatusHistoryORM.horodatage.desc(), ParcelStatusHistoryORM.id.desc())
            .all()
        )
        result = []
        for h in items:
            agent_nom = h.agent_nom
            agent_role = h.agent_role
            if not agent_nom and h.utilisateur_id:
                u = self.db.query(UserORM).filter(UserORM.id == h.utilisateur_id).first()
                if u:
                    agent_nom = u.nom_complet
                    agent_role = u.role
            result.append(
                ParcelHistoryItemDTO(
                    id=h.id,
                    colis_id=h.colis_id,
                    utilisateur_id=h.utilisateur_id,
                    agent_nom=agent_nom or "Agent Quai",
                    agent_role=agent_role or "RECEPTIONNISTE",
                    action=h.action or "CHANGEMENT_STATUT",
                    statut_precedent=h.statut_precedent,
                    statut_nouveau=h.statut_nouveau,
                    motif=h.motif,
                    details=h.details or h.motif or "Action effectuée sur le flux",
                    horodatage=h.horodatage.strftime("%d/%m/%Y %H:%M:%S") if h.horodatage else datetime.utcnow().strftime("%d/%m/%Y %H:%M:%S"),
                )
            )
        return result

    def create_parcel(
        self,
        dto: CreateParcelDTO,
        user_id: Optional[int] = None,
        user_nom: Optional[str] = None,
    ) -> ParcelResponseDTO:
        # 1. Phone validation & parsing
        phone = PhoneNumber(dto.recipient_phone)

        # 2. Axis auto-detection or manual assignment
        if dto.axis:
            axis_code = dto.axis.strip()
            gare_axis = get_axis_for_gare(axis_code)
            axis = gare_axis if gare_axis else LogisticAxis(axis_code)
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

        rec_id = dto.receptionniste_id if dto.receptionniste_id is not None else user_id
        rec_nom = dto.receptionniste_nom if dto.receptionniste_nom is not None else user_nom

        # Dynamic vendor auto-resolution / creation
        from backend.app.infrastructure.persistence.models import VendorORM
        effective_vendor_id = dto.vendor_id
        vendor = None
        if effective_vendor_id:
            vendor = self.db.query(VendorORM).filter(VendorORM.id == effective_vendor_id).first()
        if not vendor and dto.sender_name and dto.sender_name.strip():
            vendor = self.db.query(VendorORM).filter(VendorORM.nom == dto.sender_name.strip()).first()
        if not vendor:
            clean_name = (dto.sender_name or "Expéditeur Standard").strip()
            # Double check if vendor with clean_name exists
            vendor = self.db.query(VendorORM).filter(VendorORM.nom == clean_name).first()
            if not vendor:
                vendor = VendorORM(
                    nom=clean_name,
                    type_expediteur=sender_type_enum.value if hasattr(sender_type_enum, "value") else str(sender_type_enum),
                    telephone=dto.sender_phone,
                    adresse=dto.sender_address,
                    actif=1,
                )
                self.db.add(vendor)
                self.db.flush()
        effective_vendor_id = vendor.id

        parcel = Parcel(
            tracking_number=tracking_number,
            reception_date=reception_date,
            vendor_id=effective_vendor_id,
            sender_type=sender_type_enum,
            sender_name=dto.sender_name,
            sender_phone=sender_phone_vo,
            sender_address=dto.sender_address,
            recipient_name=dto.recipient_name.strip() if dto.recipient_name and dto.recipient_name.strip() else "Client",
            recipient_phone=phone,
            delivery_address=dto.delivery_address,
            designation=dto.designation,
            axis=axis,
            is_manual_axis=is_manual_axis,
            flux_type=FluxType(dto.flux_type) if dto.flux_type in [f.value for f in FluxType] else FluxType.COD,
            merchandise_amount=Money(dto.merchandise_amount),
            delivery_fee=Money(final_fee),
            receptionniste_id=rec_id,
            receptionniste_nom=rec_nom,
            observation=dto.observation,
            encaissement_lieu=dto.encaissement_lieu or "LIVREUR",
            frais_prepayes_vendeur=bool(dto.frais_prepayes_vendeur),
        )

        saved = self.repo.save(parcel)
        self.record_history(
            colis_id=saved.id,
            action="RECEPTION_QUAI",
            user_id=rec_id,
            user_nom=rec_nom,
            statut_nouveau=saved.status.value,
            details=f"Colis réceptionné au Quai par {rec_nom or 'Agent Quai'} • Flux: {saved.flux_type.value} • Axe: {saved.axis.label}",
            parcel_domain=saved,
        )
        return self._to_response_dto(saved, include_history=True)

    def create_batch(
        self,
        dto: CreateBatchParcelDTO,
        user_id: Optional[int] = None,
        user_nom: Optional[str] = None,
    ) -> List[ParcelResponseDTO]:
        return [self.create_parcel(item, user_id=user_id, user_nom=user_nom) for item in dto.parcels]

    def update_status(
        self,
        parcel_id: int,
        dto: UpdateParcelStatusDTO,
        user_id: Optional[int] = None,
        user_nom: Optional[str] = None,
        user_role: Optional[str] = None,
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
            elif old_status in [ParcelStatus.REPORTE, ParcelStatus.ANNULE_RETOUR]:
                parcel.reintegrate_to_hub()
            else:
                ParcelStateMachine.validate_transition(old_status, ParcelStatus.EN_DEPOT)
                parcel.status = ParcelStatus.EN_DEPOT
                parcel.courier_id = None
                parcel.tour_id = None

        elif target_status == ParcelStatus.RETOUR_BOUTIQUE:
            parcel.return_to_merchant()

        elif target_status == ParcelStatus.CLOTURE_CAISSE:
            parcel.close_in_cash()

        if dto.encaissement_lieu:
            parcel.encaissement_lieu = dto.encaissement_lieu
        if dto.frais_prepayes_vendeur is not None:
            parcel.frais_prepayes_vendeur = dto.frais_prepayes_vendeur
        if dto.repartition_vendeur:
            parcel.repartition_vendeur = dto.repartition_vendeur
        if dto.montant_encaisse_livreur is not None:
            parcel.montant_encaisse_livreur = Money(dto.montant_encaisse_livreur)
        if dto.montant_encaisse_vendeur is not None:
            parcel.montant_encaisse_vendeur = Money(dto.montant_encaisse_vendeur)

        # Persist updated parcel
        saved = self.repo.save(parcel)

        action_desc = f"Statut modifié de {old_status.value} vers {saved.status.value}"
        if dto.incident_reason:
            action_desc += f" (Motif: {dto.incident_reason})"

        self.record_history(
            colis_id=saved.id,
            action="CHANGEMENT_STATUT",
            user_id=user_id,
            user_nom=user_nom,
            user_role=user_role,
            statut_precedent=old_status.value,
            statut_nouveau=saved.status.value,
            motif=dto.incident_reason,
            details=f"{action_desc} par {user_nom or 'Agent'}",
            parcel_domain=saved,
        )

        return self._to_response_dto(saved, include_history=True)

    def override_parcel_axis(
        self,
        parcel_id: int,
        new_axis: str,
        user_id: Optional[int] = None,
        user_nom: Optional[str] = None,
        user_role: Optional[str] = None,
    ) -> ParcelResponseDTO:
        parcel = self.repo.get_by_id(parcel_id)
        if not parcel:
            raise BusinessRuleViolationException(f"Colis introuvable (ID: {parcel_id})")

        old_axis = parcel.axis.value
        axis_code = new_axis.strip()
        gare_axis = get_axis_for_gare(axis_code)
        target_axis = gare_axis if gare_axis else LogisticAxis(axis_code)
        parcel.override_axis(target_axis)

        saved = self.repo.save(parcel)
        self.record_history(
            colis_id=saved.id,
            action="MODIFICATION_AXE",
            user_id=user_id,
            user_nom=user_nom,
            user_role=user_role,
            statut_precedent=saved.status.value,
            statut_nouveau=saved.status.value,
            details=f"Axe logistique modifié manuellement de {old_axis} à {target_axis.value} par {user_nom or 'Agent'}",
            parcel_domain=saved,
        )
        return self._to_response_dto(saved, include_history=True)

    def update_parcel_contact(
        self,
        parcel_id: int,
        recipient_phone: Optional[str] = None,
        recipient_name: Optional[str] = None,
        delivery_address: Optional[str] = None,
        designation: Optional[str] = None,
        observation: Optional[str] = None,
        merchandise_amount: Optional[int] = None,
        delivery_fee: Optional[int] = None,
        encaissement_lieu: Optional[str] = None,
        frais_prepayes_vendeur: Optional[bool] = None,
        user_id: Optional[int] = None,
        user_nom: Optional[str] = None,
        user_role: Optional[str] = None,
    ) -> ParcelResponseDTO:
        parcel = self.repo.get_by_id(parcel_id)
        if not parcel:
            raise BusinessRuleViolationException(f"Colis introuvable (ID: {parcel_id})")

        if parcel.status in (ParcelStatus.LIVRE, ParcelStatus.ANNULE_RETOUR):
            raise BusinessRuleViolationException(f"Impossible de modifier les informations d'un colis déjà {parcel.status.value}.")

        validated_phone = None
        notes = []
        if encaissement_lieu is not None:
            parcel.encaissement_lieu = encaissement_lieu
            notes.append(f"Lieu d'encaissement : {encaissement_lieu}")
        if frais_prepayes_vendeur is not None and frais_prepayes_vendeur != parcel.frais_prepayes_vendeur:
            parcel.frais_prepayes_vendeur = frais_prepayes_vendeur
            notes.append("Frais de livraison prépayés au vendeur (déduits au reversement)" if frais_prepayes_vendeur else "Frais de livraison à encaisser par le livreur")
        if recipient_phone:
            validated_phone = PhoneNumber(recipient_phone)
            notes.append(f"Téléphone destinataire corrigé : {validated_phone.formatted}")
        if recipient_name and recipient_name.strip():
            notes.append(f"Nom destinataire : {recipient_name.strip()}")

        # Règle Métier 9 : Modification d'adresse et de tarif selon le statut
        new_fee_obj = Money(delivery_fee) if delivery_fee is not None else None
        old_fee = parcel.delivery_fee.amount
        old_addr = parcel.delivery_address

        parcel.update_delivery_details(
            delivery_address=delivery_address,
            delivery_fee=new_fee_obj,
        )

        if delivery_address and delivery_address.strip() and delivery_address.strip() != old_addr:
            new_addr = delivery_address.strip()
            notes.append(f"Adresse modifiée : {new_addr}")
            # Réaffectation automatique de l'axe si le colis est en dépôt ou assigné
            if parcel.status in (ParcelStatus.EN_DEPOT, ParcelStatus.ASSIGNE):
                detection = AxisAutoDetector.detect(new_addr, db=self.db)
                if detection.axis != parcel.axis:
                    old_axis_val = parcel.axis.value
                    parcel.axis = detection.axis
                    parcel.is_manual_axis = False
                    notes.append(f"Axe réaffecté : {old_axis_val} ➔ {detection.axis.value}")
                    if parcel.status == ParcelStatus.ASSIGNE:
                        parcel.unassign()
                        notes.append("Désassigné de l'ancienne tournée suite à changement d'axe")

        if delivery_fee is not None and delivery_fee != old_fee:
            notes.append(f"Frais de livraison ajustés : {delivery_fee} Ar (Nouveau total COD : {parcel.total_to_collect.amount} Ar)")

        if designation is not None:
            parcel.designation = designation.strip() if designation.strip() else None
            notes.append("Désignation mise à jour")
        if observation is not None:
            parcel.observation = observation.strip() if observation.strip() else None
            notes.append("Remarque / plage horaire mise à jour")
        if merchandise_amount is not None:
            parcel.merchandise_amount = Money(merchandise_amount)
            notes.append(f"Montant marchandise : {merchandise_amount} Ar")

        parcel.update_contact_info(
            recipient_phone=validated_phone,
            recipient_name=recipient_name,
        )
        saved = self.repo.save(parcel)

        if notes:
            action_name = "MODIFICATION_ADRESSE_TARIF" if (delivery_fee is not None or (delivery_address and delivery_address.strip() != old_addr)) else "MODIFICATION_INFOS"
            self.record_history(
                colis_id=saved.id,
                action=action_name,
                user_id=user_id,
                user_nom=user_nom,
                user_role=user_role,
                statut_precedent=saved.status.value,
                statut_nouveau=saved.status.value,
                motif=" • ".join(notes),
                details=f"Informations colis modifiées par {user_nom or 'Agent'} • {', '.join(notes)}",
                parcel_domain=saved,
            )

        return self._to_response_dto(saved, include_history=True)

    def get_parcel(self, parcel_id: int) -> Optional[ParcelResponseDTO]:
        p = self.repo.get_by_id(parcel_id)
        return self._to_response_dto(p, include_history=True) if p else None

    def list_parcels(
        self,
        status: Optional[str] = None,
        axis: Optional[str] = None,
        date_str: Optional[str] = None,
        tour_id: Optional[int] = None,
        courier_id: Optional[int] = None,
        flux_type: Optional[str] = None,
        receptionniste_id: Optional[int] = None,
    ) -> List[ParcelResponseDTO]:
        q = self.db.query(ParcelORM).filter(ParcelORM.actif == 1)
        if status:
            q = q.filter(ParcelORM.statut == status)
        if axis:
            q = q.filter(ParcelORM.axe == axis)
        if date_str:
            q = q.outerjoin(TourORM, ParcelORM.tournee_id == TourORM.id)
            q = q.filter(
                or_(
                    ParcelORM.date_reception == date_str,
                    TourORM.date_tournee == date_str,
                )
            )
        if tour_id is not None:
            q = q.filter(ParcelORM.tournee_id == tour_id)
        if courier_id is not None:
            q = q.filter(ParcelORM.livreur_id == courier_id)
        if flux_type:
            q = q.filter(ParcelORM.type_flux == flux_type)
        if receptionniste_id is not None:
            q = q.filter(ParcelORM.receptionniste_id == receptionniste_id)

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
        user_nom: Optional[str] = None,
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

        courier_name = None
        from backend.app.infrastructure.persistence.models import UserORM
        courier_orm = self.db.query(UserORM).filter(UserORM.id == courier_id).first()
        if courier_orm:
            courier_name = courier_orm.nom_complet

        assignment_motif = (
            reason
            or (f"Réassignation d'urgence (Super Admin) vers le coursier #{courier_id}"
                if old_status == ParcelStatus.EN_COURS
                else f"Réassigné du coursier #{old_courier_id} vers le coursier #{courier_id}")
        )

        parcel.assign_to_courier(courier_id=courier_id, tour_id=target_tour_id, reason=assignment_motif)
        saved = self.repo.save(parcel)

        # Record audit trail
        assignment_details = (
            f"Colis réassigné au coursier {courier_name or courier_id} (Tournée #{target_tour_id}) par {user_nom or user_role}"
        )
        self.record_history(
            colis_id=saved.id,
            action="AFFECTATION_LIVREUR",
            user_id=user_id,
            user_nom=user_nom,
            user_role=user_role,
            statut_precedent=old_status.value,
            statut_nouveau=saved.status.value,
            motif=assignment_motif,
            details=assignment_details,
            parcel_domain=saved,
        )

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
        return self._to_response_dto(saved, include_history=True)

    def mark_as_prepaid(
        self,
        parcel_id: int,
        dto: MarkPrepaidDTO,
        user_id: Optional[int] = None,
        user_nom: Optional[str] = None,
        user_role: Optional[str] = None,
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

        self.record_history(
            colis_id=saved.id,
            action="REGLEMENT_PREPAYE",
            user_id=user_id,
            user_nom=user_nom,
            user_role=user_role,
            statut_precedent=parcel.status.value,
            statut_nouveau=saved.status.value,
            motif=motif_audit,
            details=f"Paiement anticipé validé par {user_nom or 'Agent'}: {dto.payment_method} ({dto.prepaid_type}) - Réf: {dto.payment_reference or 'N/A'}",
            parcel_domain=saved,
        )

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
        return self._to_response_dto(saved, include_history=True)

    def delete_parcel(self, parcel_id: int, user_role: str, user_id: Optional[int] = None) -> bool:
        """Supprime définitivement un colis et ses enregistrements associés. Réservé SUPERVISEUR et SUPER_ADMIN."""
        if user_role not in ["SUPERVISEUR", "SUPER_ADMIN"]:
            raise BusinessRuleViolationException(
                f"Action non autorisée. Profil requis : SUPERVISEUR ou SUPER_ADMIN (profil actuel : {user_role})."
            )

        parcel_orm = self.db.query(ParcelORM).filter(ParcelORM.id == parcel_id).first()
        if not parcel_orm:
            raise DomainException(f"Colis #{parcel_id} introuvable.")

        from backend.app.infrastructure.persistence.models import (
            CourierDebtORM,
            CashCollectionORM,
        )

        # 1. Détacher les dettes éventuelles
        self.db.query(CourierDebtORM).filter(CourierDebtORM.colis_id == parcel_id).update({"colis_id": None})

        # 2. Supprimer les encaissements associés
        self.db.query(CashCollectionORM).filter(CashCollectionORM.colis_id == parcel_id).delete()

        # 3. Supprimer l'historique de statut
        self.db.query(ParcelStatusHistoryORM).filter(ParcelStatusHistoryORM.colis_id == parcel_id).delete()

        tour_id = parcel_orm.tournee_id

        # 4. Supprimer le colis
        self.db.delete(parcel_orm)

        # 5. Si le colis était affecté à une tournée, mettre à jour la tournée
        if tour_id:
            from backend.app.infrastructure.persistence.repositories import PostgresTourRepository
            tour_repo = PostgresTourRepository(self.db)
            t = tour_repo.get_by_id(tour_id)
            if t:
                remaining = self.db.query(ParcelORM).filter(
                    ParcelORM.tournee_id == tour_id,
                    ParcelORM.actif == 1,
                    ParcelORM.id != parcel_id,
                ).all()
                t.parcels = [self.repo._to_domain(po) for po in remaining]
                t.calculate_theoretical_total()
                tour_repo.save(t)

        self.db.commit()
        return True

    def delete_parcels(self, parcel_ids: List[int], user_role: str, user_id: Optional[int] = None) -> dict:
        """Supprime par lot une liste de colis. Réservé SUPERVISEUR et SUPER_ADMIN."""
        if user_role not in ["SUPERVISEUR", "SUPER_ADMIN"]:
            raise BusinessRuleViolationException(
                f"Action non autorisée. Profil requis : SUPERVISEUR ou SUPER_ADMIN (profil actuel : {user_role})."
            )

        if not parcel_ids:
            return {"success": True, "deleted_count": 0, "deleted_ids": [], "errors": []}

        from backend.app.infrastructure.persistence.models import (
            CourierDebtORM,
            CashCollectionORM,
        )
        from backend.app.infrastructure.persistence.repositories import PostgresTourRepository

        tour_repo = PostgresTourRepository(self.db)
        deleted_ids = []
        errors = []
        impacted_tour_ids = set()

        for pid in parcel_ids:
            try:
                p_orm = self.db.query(ParcelORM).filter(ParcelORM.id == pid).first()
                if not p_orm:
                    continue
                if p_orm.tournee_id:
                    impacted_tour_ids.add(p_orm.tournee_id)

                self.db.query(CourierDebtORM).filter(CourierDebtORM.colis_id == pid).update({"colis_id": None})
                self.db.query(CashCollectionORM).filter(CashCollectionORM.colis_id == pid).delete()
                self.db.query(ParcelStatusHistoryORM).filter(ParcelStatusHistoryORM.colis_id == pid).delete()
                self.db.delete(p_orm)
                deleted_ids.append(pid)
            except Exception as e:
                errors.append(f"Colis #{pid}: {str(e)}")

        for tid in impacted_tour_ids:
            t = tour_repo.get_by_id(tid)
            if t:
                remaining = self.db.query(ParcelORM).filter(
                    ParcelORM.tournee_id == tid,
                    ParcelORM.actif == 1,
                    ~ParcelORM.id.in_(deleted_ids),
                ).all()
                t.parcels = [self.repo._to_domain(po) for po in remaining]
                t.calculate_theoretical_total()
                tour_repo.save(t)

        self.db.commit()
        return {
            "success": True,
            "deleted_count": len(deleted_ids),
            "deleted_ids": deleted_ids,
            "errors": errors,
        }

