"""Strawberry GraphQL Schema unifying queries and mutations."""

from typing import List, Optional
import strawberry
from strawberry.types import Info
from backend.app.application.dtos.other_dtos import CloseTourDTO, RepayDebtDTO
from backend.app.application.dtos.parcel_dtos import CreateParcelDTO, UpdateParcelStatusDTO
from backend.app.application.use_cases.parcel_use_cases import ParcelUseCases
from backend.app.application.use_cases.tour_use_cases import (
    CourierUseCases,
    DisputeUseCases,
    TourUseCases,
)
from backend.app.infrastructure.database.connection import SessionLocal
from backend.app.infrastructure.persistence.models import AxisORM, CourierDebtORM, TourORM


# --- GraphQL Types ---

@strawberry.type
class ParcelType:
    id: int
    tracking_number: str
    reception_date: str
    vendor_id: int
    sender_type: str
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
    driver_contact: Optional[str] = None
    vehicle_plate: Optional[str] = None
    observation: Optional[str] = None
    active: bool


@strawberry.type
class CourierType:
    id: int
    name: str
    phone: str
    phone_formatted: str
    vehicle_type: str
    security_deposit: int
    security_deposit_formatted: str
    active: bool


@strawberry.type
class TourType:
    id: int
    tour_date: str
    courier_id: int
    status: str
    theoretical_total: int
    actual_remitted: int
    discrepancy: int
    closed_at: Optional[str] = None
    courier_name: Optional[str] = None
    courier_phone: Optional[str] = None
    courier_phone_formatted: Optional[str] = None
    courier_vehicle: Optional[str] = None
    parcels_count: int = 0
    parcels: List[ParcelType] = strawberry.field(default_factory=list)


@strawberry.type
class DisputeType:
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


@strawberry.type
class ScorecardType:
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


@strawberry.type
class AxisType:
    id: int
    code: str
    libelle: str
    zones: List[str]


@strawberry.type
class VendorType:
    id: int
    nom: str
    type_expediteur: str
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    email: Optional[str] = None
    contact_responsable: Optional[str] = None
    nif_stat: Optional[str] = None
    modalite_paiement: str
    actif: bool


# --- GraphQL Inputs ---

@strawberry.input
class CreateParcelInput:
    vendor_id: int
    sender_type: str = "CYBERMARCHAND"
    sender_name: Optional[str] = None
    sender_phone: Optional[str] = None
    sender_address: Optional[str] = None
    recipient_name: str
    recipient_phone: str
    delivery_address: str
    designation: Optional[str] = None
    flux_type: str = "COD"
    merchandise_amount: int = 0
    delivery_fee: int = 5000
    tracking_number: Optional[str] = None
    axis: Optional[str] = None
    observation: Optional[str] = None


@strawberry.input
class UpdateParcelStatusInput:
    parcel_id: int
    status: str
    courier_id: Optional[int] = None
    tour_id: Optional[int] = None
    payment_method: Optional[str] = None
    reschedule_date: Optional[str] = None
    incident_reason: Optional[str] = None
    partner_name: Optional[str] = None
    partner_reference: Optional[str] = None
    partner_fee: Optional[int] = None


@strawberry.input
class AssignTourInput:
    courier_id: int
    tour_date: str
    parcel_ids: List[int]


@strawberry.input
class CloseTourInput:
    tour_id: int
    cash_and_mobile_remitted: int


@strawberry.input
class RepayDebtInput:
    debt_id: int
    amount: int
    closure_date: Optional[str] = None


# --- Queries ---

@strawberry.type
class Query:
    @strawberry.field
    def parcels(
        self,
        status: Optional[str] = None,
        axis: Optional[str] = None,
        date: Optional[str] = None,
        tour_id: Optional[int] = None,
    ) -> List[ParcelType]:
        db = SessionLocal()
        try:
            uc = ParcelUseCases(db)
            results = uc.list_parcels(status=status, axis=axis, date_str=date, tour_id=tour_id)
            return [ParcelType(**r.model_dump()) for r in results]
        finally:
            db.close()

    @strawberry.field
    def parcel(self, id: int) -> Optional[ParcelType]:
        db = SessionLocal()
        try:
            uc = ParcelUseCases(db)
            res = uc.get_parcel(id)
            return ParcelType(**res.model_dump()) if res else None
        finally:
            db.close()

    @strawberry.field
    def couriers(self) -> List[CourierType]:
        db = SessionLocal()
        try:
            uc = CourierUseCases(db)
            results = uc.list_couriers()
            return [CourierType(**r.model_dump()) for r in results]
        finally:
            db.close()

    @strawberry.field
    def tour(self, id: int) -> Optional[TourType]:
        db = SessionLocal()
        try:
            uc = TourUseCases(db)
            detail = uc.get_tour_detail(id)
            return TourType(
                id=detail.id,
                tour_date=detail.tour_date,
                courier_id=detail.courier_id,
                status=detail.status,
                theoretical_total=detail.theoretical_total,
                actual_remitted=detail.actual_remitted,
                discrepancy=detail.discrepancy,
                closed_at=detail.closed_at,
                courier_name=detail.courier_name,
                courier_phone=detail.courier_phone,
                courier_phone_formatted=detail.courier_phone_formatted,
                courier_vehicle=detail.courier_vehicle,
                parcels_count=detail.parcels_count,
                parcels=[ParcelType(**p.model_dump()) for p in detail.parcels],
            )
        except Exception:
            return None
        finally:
            db.close()

    @strawberry.field
    def tours(self, date: Optional[str] = None) -> List[TourType]:
        db = SessionLocal()
        try:
            q = db.query(TourORM)
            if date:
                q = q.filter(TourORM.date_tournee == date)
            orms = q.all()
            uc = TourUseCases(db)
            results = []
            for o in orms:
                detail = uc.get_tour_detail(o.id)
                results.append(
                    TourType(
                        id=detail.id,
                        tour_date=detail.tour_date,
                        courier_id=detail.courier_id,
                        status=detail.status,
                        theoretical_total=detail.theoretical_total,
                        actual_remitted=detail.actual_remitted,
                        discrepancy=detail.discrepancy,
                        closed_at=detail.closed_at,
                        courier_name=detail.courier_name,
                        courier_phone=detail.courier_phone,
                        courier_phone_formatted=detail.courier_phone_formatted,
                        courier_vehicle=detail.courier_vehicle,
                        parcels_count=detail.parcels_count,
                        parcels=[ParcelType(**p.model_dump()) for p in detail.parcels],
                    )
                )
            return results
        finally:
            db.close()

    @strawberry.field
    def disputes(self, courier_id: Optional[int] = None) -> List[DisputeType]:
        db = SessionLocal()
        try:
            uc = DisputeUseCases(db)
            q = db.query(CourierDebtORM)
            if courier_id:
                q = q.filter(CourierDebtORM.livreur_id == courier_id)
            orms = q.all()
            return [
                DisputeType(
                    id=o.id,
                    reference_litige=o.reference_litige,
                    livreur_id=o.livreur_id,
                    colis_id=o.colis_id,
                    tournee_id=o.tournee_id,
                    incident_type=o.type_incident,
                    initial_amount=int(o.montant_initial_dette),
                    refunded_amount=int(o.montant_rembourse),
                    remaining_balance=int(o.solde_restant),
                    status=o.statut_dette,
                    reason=o.motif_circonstancie,
                    incident_date=o.date_incident,
                    closure_date=o.date_cloture,
                )
                for o in orms
            ]
        finally:
            db.close()

    @strawberry.field
    def scorecard(self, courier_id: int, period: str) -> ScorecardType:
        db = SessionLocal()
        try:
            uc = CourierUseCases(db)
            res = uc.compute_scorecard(courier_id, period)
            return ScorecardType(**res.model_dump())
        finally:
            db.close()

    @strawberry.field
    def axes(self) -> List[AxisType]:
        db = SessionLocal()
        try:
            axes = db.query(AxisORM).filter(AxisORM.actif == 1).order_by(AxisORM.id.asc()).all()
            return [
                AxisType(id=a.id, code=a.code, libelle=a.libelle, zones=[z.nom for z in a.zones])
                for a in axes
            ]
        finally:
            db.close()

    @strawberry.field
    def vendors(self, type_expediteur: Optional[str] = None) -> List[VendorType]:
        db = SessionLocal()
        try:
            from backend.app.infrastructure.persistence.models import VendorORM
            q = db.query(VendorORM).filter(VendorORM.actif == 1)
            if type_expediteur:
                q = q.filter(VendorORM.type_expediteur == type_expediteur)
            return [
                VendorType(
                    id=v.id,
                    nom=v.nom,
                    type_expediteur=v.type_expediteur or "CYBERMARCHAND",
                    telephone=v.telephone,
                    adresse=v.adresse,
                    email=v.email,
                    contact_responsable=v.contact_responsable,
                    nif_stat=v.nif_stat,
                    modalite_paiement=v.modalite_paiement,
                    actif=bool(v.actif),
                )
                for v in q.all()
            ]
        finally:
            db.close()


# --- Mutations ---

@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_parcel(self, input: CreateParcelInput) -> ParcelType:
        db = SessionLocal()
        try:
            uc = ParcelUseCases(db)
            dto = CreateParcelDTO(
                vendor_id=input.vendor_id,
                recipient_name=input.recipient_name,
                recipient_phone=input.recipient_phone,
                delivery_address=input.delivery_address,
                designation=input.designation,
                flux_type=input.flux_type,
                merchandise_amount=input.merchandise_amount,
                delivery_fee=input.delivery_fee,
                tracking_number=input.tracking_number,
                axis=input.axis,
                observation=input.observation,
            )
            res = uc.create_parcel(dto)
            return ParcelType(**res.model_dump())
        finally:
            db.close()

    @strawberry.mutation
    def update_parcel_status(self, input: UpdateParcelStatusInput) -> ParcelType:
        db = SessionLocal()
        try:
            uc = ParcelUseCases(db)
            dto = UpdateParcelStatusDTO(
                status=input.status,
                courier_id=input.courier_id,
                tour_id=input.tour_id,
                payment_method=input.payment_method,
                reschedule_date=input.reschedule_date,
                incident_reason=input.incident_reason,
                partner_name=input.partner_name,
                partner_reference=input.partner_reference,
                partner_fee=input.partner_fee,
            )
            res = uc.update_status(input.parcel_id, dto)
            return ParcelType(**res.model_dump())
        finally:
            db.close()

    @strawberry.mutation
    def override_parcel_axis(self, parcel_id: int, new_axis: str) -> ParcelType:
        db = SessionLocal()
        try:
            uc = ParcelUseCases(db)
            res = uc.override_parcel_axis(parcel_id, new_axis)
            return ParcelType(**res.model_dump())
        finally:
            db.close()

    @strawberry.mutation
    def assign_tour(self, input: AssignTourInput) -> TourType:
        db = SessionLocal()
        try:
            uc = TourUseCases(db)
            res = uc.create_or_assign_tour(input.courier_id, input.tour_date, input.parcel_ids)
            detail = uc.get_tour_detail(res.id)
            return TourType(
                id=detail.id,
                tour_date=detail.tour_date,
                courier_id=detail.courier_id,
                status=detail.status,
                theoretical_total=detail.theoretical_total,
                actual_remitted=detail.actual_remitted,
                discrepancy=detail.discrepancy,
                closed_at=detail.closed_at,
                courier_name=detail.courier_name,
                courier_phone=detail.courier_phone,
                courier_phone_formatted=detail.courier_phone_formatted,
                courier_vehicle=detail.courier_vehicle,
                parcels_count=detail.parcels_count,
                parcels=[ParcelType(**p.model_dump()) for p in detail.parcels],
            )
        finally:
            db.close()

    @strawberry.mutation
    def close_tour(self, input: CloseTourInput) -> TourType:
        db = SessionLocal()
        try:
            uc = TourUseCases(db)
            res = uc.close_tour(input.tour_id, CloseTourDTO(cash_and_mobile_remitted=input.cash_and_mobile_remitted))
            return TourType(**res.model_dump())
        finally:
            db.close()

    @strawberry.mutation
    def repay_debt(self, input: RepayDebtInput) -> DisputeType:
        db = SessionLocal()
        try:
            uc = DisputeUseCases(db)
            res = uc.repay_debt(input.debt_id, RepayDebtDTO(amount=input.amount, closure_date=input.closure_date))
            return DisputeType(**res.model_dump())
        finally:
            db.close()


schema = strawberry.Schema(query=Query, mutation=Mutation)
