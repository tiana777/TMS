"""Parcel DTOs."""

from typing import List, Optional
from pydantic import BaseModel, Field


class CreateParcelDTO(BaseModel):
    vendor_id: int
    sender_type: str = "CYBERMARCHAND"  # CYBERMARCHAND, PARTICULIER, ENTREPRISE
    sender_name: Optional[str] = None
    sender_phone: Optional[str] = None
    sender_address: Optional[str] = None
    recipient_name: str
    recipient_phone: str
    delivery_address: str
    designation: Optional[str] = None
    flux_type: str = "COD"  # COD, SIMPLE, RETOUR, PROVINCE
    merchandise_amount: int = 0
    delivery_fee: int = 5000
    tracking_number: Optional[str] = None
    reception_date: Optional[str] = None  # YYYY-MM-DD
    axis: Optional[str] = None  # If None, auto-detected!
    is_manual_axis: bool = False
    observation: Optional[str] = None


class CreateBatchParcelDTO(BaseModel):
    parcels: List[CreateParcelDTO]


class UpdateParcelAxisDTO(BaseModel):
    axis: str


class UpdateParcelContactDTO(BaseModel):
    recipient_name: Optional[str] = None
    recipient_phone: Optional[str] = None
    delivery_address: Optional[str] = None


class ReassignParcelDTO(BaseModel):
    courier_id: int
    tour_id: Optional[int] = None
    tour_date: Optional[str] = None  # YYYY-MM-DD
    reason: Optional[str] = None


class MarkPrepaidDTO(BaseModel):
    prepaid_type: str = "ALL"  # "ALL" (tout réglé, total=0 Ar) ou "MERCHANDISE_ONLY"
    payment_method: str = "MVOLA"  # ESPECES, MVOLA, AIRTEL, ORANGE_MONEY, VIREMENT
    payment_reference: Optional[str] = None
    observation: Optional[str] = None


class BulkCloseCashDTO(BaseModel):
    parcel_ids: List[int]


class UpdateParcelStatusDTO(BaseModel):
    status: str
    courier_id: Optional[int] = None
    tour_id: Optional[int] = None
    payment_method: Optional[str] = None  # ESPECES, MVOLA, AIRTEL, ORANGE_MONEY
    reschedule_date: Optional[str] = None  # YYYY-MM-DD
    incident_reason: Optional[str] = None
    partner_name: Optional[str] = None
    partner_reference: Optional[str] = None
    partner_fee: Optional[int] = None


class ParcelResponseDTO(BaseModel):
    id: int
    tracking_number: str
    reception_date: str
    vendor_id: int
    sender_type: str = "CYBERMARCHAND"
    sender_name: Optional[str] = None
    sender_phone: Optional[str] = None
    sender_phone_formatted: Optional[str] = None
    sender_operator: Optional[str] = None
    sender_address: Optional[str] = None
    recipient_name: str
    recipient_phone: str
    recipient_phone_formatted: str
    operator: str
    delivery_address: str
    designation: Optional[str] = None
    axis: str
    axis_label: str
    is_manual_axis: bool = False
    flux_type: str
    merchandise_amount: int
    delivery_fee: int
    total_to_collect: int
    total_to_collect_formatted: str
    partner_fee: int
    status: str
    status_label: str
    courier_id: Optional[int] = None
    tour_id: Optional[int] = None
    payment_method: Optional[str] = None
    reschedule_date: Optional[str] = None
    incident_reason: Optional[str] = None
    partner_name: Optional[str] = None
    partner_reference: Optional[str] = None
    observation: Optional[str] = None
    active: bool
