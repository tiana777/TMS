"""Vendor Payout & Remittance DTOs according to CDC sections 9 & 13.3."""

from typing import List, Optional
from pydantic import BaseModel


class CreatePayoutDTO(BaseModel):
    vendor_id: int
    parcel_ids: List[int]
    payment_mode: str = "MVOLA"  # MVOLA, AIRTEL_MONEY, ORANGE_MONEY, ESPECES, VIREMENT
    payment_reference: Optional[str] = None
    notes: Optional[str] = None
    indemnisation_litiges: int = 0


class PayoutParcelSummaryDTO(BaseModel):
    id: int
    tracking_number: str
    recipient_name: str
    merchandise_amount: int
    delivery_fee: int
    status: str
    reception_date: str
    frais_prepayes_vendeur: bool = False


class PayoutResponseDTO(BaseModel):
    id: int
    reference_reversement: str
    vendor_id: int
    vendor_name: str
    vendor_phone: Optional[str] = None
    vendor_address: Optional[str] = None
    date_reversement: str
    total_marchandise_encaissee: int
    total_frais_livraison_deduits: int
    total_indemnisation_litiges: int
    solde_net_verse: int
    solde_net_verse_formatted: str
    mode_reglement: str
    reference_preuve: Optional[str] = None
    statut: str
    nombre_colis: int
    notes: Optional[str] = None
    created_at: str
    colis: List[PayoutParcelSummaryDTO] = []


class PendingPayoutSummaryDTO(BaseModel):
    vendor_id: int
    vendor_name: str
    vendor_type: str
    vendor_phone: Optional[str] = None
    vendor_address: Optional[str] = None
    eligible_parcels_count: int
    total_merchandise: int
    total_delivery_fees: int
    total_indemnisation_litiges: int = 0
    net_payable: int
    net_payable_formatted: str
    eligible_parcels: List[PayoutParcelSummaryDTO] = []
