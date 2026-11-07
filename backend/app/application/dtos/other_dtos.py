"""Courier, Tour, Dispute and Scorecard DTOs."""

from typing import List, Optional
from pydantic import BaseModel


class CreateCourierDTO(BaseModel):
    name: str
    phone: str
    vehicle_type: str
    security_deposit: int = 0


class CourierResponseDTO(BaseModel):
    id: int
    name: str
    phone: str
    phone_formatted: str
    vehicle_type: str
    security_deposit: int
    security_deposit_formatted: str
    active: bool


class CreateTourDTO(BaseModel):
    courier_id: int
    tour_date: str  # YYYY-MM-DD
    parcel_ids: List[int]


class CloseTourDTO(BaseModel):
    cash_and_mobile_remitted: int


class TourResponseDTO(BaseModel):
    id: int
    tour_date: str
    courier_id: int
    status: str
    theoretical_total: int
    actual_remitted: int
    discrepancy: int
    closed_at: Optional[str] = None


class CreateDisputeDTO(BaseModel):
    livreur_id: int
    incident_type: str
    initial_amount: int
    reason: str
    incident_date: str  # YYYY-MM-DD
    colis_id: Optional[int] = None
    tournee_id: Optional[int] = None


class RepayDebtDTO(BaseModel):
    amount: int
    closure_date: Optional[str] = None


class DisputeResponseDTO(BaseModel):
    id: int
    reference_litige: str
    livreur_id: int
    colis_id: Optional[int] = None
    tournee_id: Optional[int] = None
    incident_type: str
    initial_amount: int
    refunded_amount: int
    remaining_balance: int
    status: str
    reason: str
    incident_date: str
    closure_date: Optional[str] = None


class ScorecardResponseDTO(BaseModel):
    livreur_id: int
    period: str
    total_assigned: int
    total_delivered: int
    success_rate: float
    punctuality_rate: float
    quality_rate: float
    cash_rigor_rate: float
    global_score: float
    tier: str
    bonus_amount: int
    bonus_formatted: str
