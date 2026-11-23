"""Domain Entity: Parcel (Colis) according to CDC sections 4, 7, 8 & 12."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
from backend.app.domain.exceptions import BusinessRuleViolationException
from backend.app.domain.models.vendor import SenderType
from backend.app.domain.state_machine.parcel_fsm import (
    ParcelStateMachine,
    ParcelStatus,
    PaymentMethod,
    TransitionContext,
)
from backend.app.domain.value_objects.axis import LogisticAxis
from backend.app.domain.value_objects.money import Money
from backend.app.domain.value_objects.phone_number import PhoneNumber


class FluxType(str, Enum):
    """The 5 business logistic flows from CDC."""
    COD = "COD"            # Cash On Delivery: Merchandise + Delivery Fee
    SIMPLE = "SIMPLE"      # Port Payé: Delivery fee only (or 0)
    RETOUR = "RETOUR"      # Reverse logistics / SAV
    PROVINCE = "PROVINCE"  # Regional freight via cooperative
    ENTREPRISE = "ENTREPRISE"  # Flux Entreprises & B2B (grands comptes, facturation périodique)


@dataclass
class Parcel:
    """Rich Domain Entity for a parcel in TMS Express."""
    tracking_number: str
    reception_date: str
    vendor_id: int
    recipient_name: str
    recipient_phone: PhoneNumber
    delivery_address: str
    axis: LogisticAxis
    flux_type: FluxType
    merchandise_amount: Money
    delivery_fee: Money
    designation: Optional[str] = None
    sender_type: SenderType = SenderType.CYBERMARCHAND
    sender_name: Optional[str] = None
    sender_phone: Optional[PhoneNumber] = None
    sender_address: Optional[str] = None
    is_manual_axis: bool = False
    id: Optional[int] = None
    tour_id: Optional[int] = None
    courier_id: Optional[int] = None
    partner_id: Optional[int] = None
    zone_id: Optional[int] = None
    partner_fee: Money = field(default_factory=Money.zero)
    status: ParcelStatus = ParcelStatus.EN_DEPOT
    reschedule_date: Optional[str] = None
    incident_reason: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    partner_reference: Optional[str] = None
    partner_name: Optional[str] = None
    driver_contact: Optional[str] = None
    vehicle_plate: Optional[str] = None
    encaissement_lieu: Optional[str] = "LIVREUR"
    repartition_vendeur: Optional[str] = None
    montant_encaisse_livreur: Optional[Money] = None
    montant_encaisse_vendeur: Optional[Money] = None
    remittance_id: Optional[int] = None
    remittance_status: str = "NON_REVERSE"
    receptionniste_id: Optional[int] = None
    receptionniste_nom: Optional[str] = None
    dernier_agent_id: Optional[int] = None
    dernier_agent_nom: Optional[str] = None
    derniere_action: Optional[str] = None
    derniere_action_at: Optional[datetime] = None
    observation: Optional[str] = None
    active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        # Validate business invariants
        if not self.tracking_number:
            raise BusinessRuleViolationException("Le numéro de bordereau (BDR) est obligatoire.")
        if not self.recipient_name or not self.recipient_name.strip():
            self.recipient_name = "Client"
        if not self.delivery_address or not self.delivery_address.strip():
            raise BusinessRuleViolationException("Le lieu / adresse de livraison est obligatoire.")

        # Invariant for flux types
        if self.flux_type == FluxType.SIMPLE and self.merchandise_amount.amount > 0:
            raise BusinessRuleViolationException(
                "Un flux 'Course Simple' (Port Payé) a une valeur marchandise de 0 Ar."
            )

    @property
    def total_to_collect(self) -> Money:
        """Inviolable Total to Collect formula: Merchandise Amount + Delivery Fee (CDC section 4 & 7.2)."""
        return self.merchandise_amount + self.delivery_fee

    def override_axis(self, new_axis: LogisticAxis) -> None:
        """Allow manual override of logistic corridor if locality is new/custom (CDC Section 5.2)."""
        if self.status not in (ParcelStatus.EN_DEPOT, ParcelStatus.ASSIGNE):
            raise BusinessRuleViolationException(
                f"Impossible de modifier l'axe d'un colis au statut '{self.status.value}'. Autorisé uniquement sous EN_DEPOT ou ASSIGNE."
            )
        self.axis = new_axis
        self.is_manual_axis = True
        is_prov = "PROV" in str(new_axis).upper()
        if is_prov:
            self.flux_type = FluxType.PROVINCE
        elif self.flux_type == FluxType.PROVINCE and not is_prov:
            self.flux_type = FluxType.COD if self.merchandise_amount.amount > 0 else FluxType.SIMPLE

    def update_contact_info(
        self,
        recipient_phone: Optional[PhoneNumber] = None,
        recipient_name: Optional[str] = None,
        delivery_address: Optional[str] = None,
    ) -> None:
        """Allow correction of recipient contact info according to CDC section 3.2."""
        if recipient_phone is not None:
            self.recipient_phone = recipient_phone
        if recipient_name and recipient_name.strip():
            self.recipient_name = recipient_name.strip()
        if delivery_address and delivery_address.strip():
            self.delivery_address = delivery_address.strip()

    def assign_to_courier(self, courier_id: int, tour_id: Optional[int] = None, reason: Optional[str] = None) -> None:
        """Assign or reassign parcel to a courier or transit shuttle."""
        ctx = TransitionContext(courier_id=courier_id, incident_reason=reason)
        ParcelStateMachine.validate_transition(self.status, ParcelStatus.ASSIGNE, ctx)
        self.courier_id = courier_id
        self.tour_id = tour_id
        self.status = ParcelStatus.ASSIGNE

    def unassign(self) -> None:
        """Cancel assignment and return to stock."""
        ParcelStateMachine.validate_transition(self.status, ParcelStatus.EN_DEPOT)
        self.courier_id = None
        self.tour_id = None
        self.status = ParcelStatus.EN_DEPOT

    def start_delivery(self) -> None:
        """Mark courier departure on delivery tour."""
        ParcelStateMachine.validate_transition(self.status, ParcelStatus.EN_COURS)
        self.status = ParcelStatus.EN_COURS

    def mark_as_delivered(self, payment_method: Optional[PaymentMethod] = None) -> None:
        """Confirm physical delivery. If payment_method is passed, also confirm cash collection (for backward compatibility)."""
        if payment_method:
            ctx = TransitionContext(payment_method=payment_method)
            ParcelStateMachine.validate_transition(self.status, ParcelStatus.LIVRE_ENCAISSE, ctx)
            self.payment_method = payment_method
            self.status = ParcelStatus.LIVRE_ENCAISSE
        else:
            ParcelStateMachine.validate_transition(self.status, ParcelStatus.LIVRE)
            self.status = ParcelStatus.LIVRE

    def mark_as_cashed(self, payment_method: PaymentMethod) -> None:
        """Confirm cash or mobile money collection and transition to ENCAISSE."""
        ctx = TransitionContext(payment_method=payment_method)
        ParcelStateMachine.validate_transition(self.status, ParcelStatus.ENCAISSE, ctx)
        self.payment_method = payment_method
        self.status = ParcelStatus.ENCAISSE

    def mark_as_prepaid(
        self,
        prepaid_type: str = "ALL",
        payment_method: Optional[PaymentMethod] = None,
        payment_reference: Optional[str] = None,
    ) -> None:
        """Handle case where customer paid in advance directly to headquarters/merchant.
        Cancels COD by setting merchandise and/or delivery fee to 0 Ar.
        """
        ref_str = f" - Réf: {payment_reference}" if payment_reference else ""
        method_name = payment_method.value if payment_method else "EN_LIGNE"

        if prepaid_type == "ALL":
            old_total = self.total_to_collect.amount
            self.merchandise_amount = Money.zero()
            self.delivery_fee = Money.zero()
            self.flux_type = FluxType.SIMPLE
            self.payment_method = payment_method
            note = f"Paiement anticipé intégral {method_name}{ref_str} (COD initial {old_total} Ar neutralisé)"
            self.observation = f"{self.observation} | {note}" if self.observation else note
        elif prepaid_type == "MERCHANDISE_ONLY":
            old_merch = self.merchandise_amount.amount
            self.merchandise_amount = Money.zero()
            self.payment_method = payment_method
            note = f"Marchandise payée d'avance {method_name}{ref_str} ({old_merch} Ar). Frais de port restants: {self.delivery_fee.amount} Ar"
            self.observation = f"{self.observation} | {note}" if self.observation else note

    def reschedule(self, new_date: str, reason: str) -> None:
        """Customer postponed delivery to a specific date."""
        ctx = TransitionContext(reschedule_date=new_date, incident_reason=reason)
        ParcelStateMachine.validate_transition(self.status, ParcelStatus.REPORTE, ctx)
        self.reschedule_date = new_date
        self.incident_reason = reason
        self.status = ParcelStatus.REPORTE

    def cancel_and_return(self, reason: str) -> None:
        """Customer refused goods or cancelled order."""
        ctx = TransitionContext(incident_reason=reason)
        ParcelStateMachine.validate_transition(self.status, ParcelStatus.ANNULE_RETOUR, ctx)
        self.incident_reason = reason
        self.status = ParcelStatus.ANNULE_RETOUR

    def outsource_to_province(
        self,
        partner_name: str,
        partner_reference: str,
        partner_fee: Money,
        driver_contact: Optional[str] = None,
        vehicle_plate: Optional[str] = None,
    ) -> None:
        """Handover to regional transport cooperative at bus station."""
        ctx = TransitionContext(
            partner_name=partner_name,
            partner_reference=partner_reference,
            partner_fee=partner_fee.amount,
        )
        ParcelStateMachine.validate_transition(self.status, ParcelStatus.SOUS_TRAITE, ctx)
        self.partner_name = partner_name
        self.partner_reference = partner_reference
        self.partner_fee = partner_fee
        self.driver_contact = driver_contact
        self.vehicle_plate = vehicle_plate
        self.status = ParcelStatus.SOUS_TRAITE

    def confirm_province_pickup(self) -> None:
        """Regional customer picked up parcel at destination branch."""
        ParcelStateMachine.validate_transition(self.status, ParcelStatus.LIVRE_ENCAISSE)
        self.status = ParcelStatus.LIVRE_ENCAISSE

    def reintegrate_to_hub(self) -> None:
        """Physically return parcel to Central Hub warehouse for subsequent action."""
        ParcelStateMachine.validate_transition(self.status, ParcelStatus.EN_DEPOT)
        self.status = ParcelStatus.EN_DEPOT

    def return_to_merchant(self) -> None:
        """Handover back to cybermerchant against receipt."""
        ParcelStateMachine.validate_transition(self.status, ParcelStatus.RETOUR_BOUTIQUE)
        self.status = ParcelStatus.RETOUR_BOUTIQUE

    def close_in_cash(self) -> None:
        """Accounting validation during cash register closure."""
        ParcelStateMachine.validate_transition(self.status, ParcelStatus.CLOTURE_CAISSE)
        self.status = ParcelStatus.CLOTURE_CAISSE
