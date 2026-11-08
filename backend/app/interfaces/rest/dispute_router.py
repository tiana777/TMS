"""Dispute REST Router."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.application.dtos.other_dtos import (
    CancelForceMajeureDTO,
    CreateDisputeDTO,
    DisputeResponseDTO,
    RepayDebtDTO,
)
from backend.app.application.use_cases.tour_use_cases import DisputeUseCases
from backend.app.domain.exceptions import DomainException
from backend.app.infrastructure.database.connection import get_db
from backend.app.infrastructure.persistence.models import CourierDebtORM, UserORM
from backend.app.infrastructure.persistence.repositories import PostgresDisputeRepository
from backend.app.infrastructure.security.auth import get_current_user, require_roles

router = APIRouter(prefix="/disputes", tags=["Litiges & Dettes Livreurs"])


@router.get("", response_model=List[DisputeResponseDTO])
def list_disputes(
    courier_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(get_current_user),
):
    repo = PostgresDisputeRepository(db)
    use_cases = DisputeUseCases(db)
    if courier_id:
        debts = repo.list_by_courier(courier_id)
    else:
        orms = db.query(CourierDebtORM).order_by(CourierDebtORM.id.desc()).all()
        debts = [repo._to_domain(o) for o in orms]
    return [use_cases._to_dispute_dto(d) for d in debts]


@router.post("", response_model=DisputeResponseDTO, status_code=status.HTTP_201_CREATED)
def create_dispute(
    dto: CreateDisputeDTO,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["SUPER_ADMIN"])),
):
    try:
        use_cases = DisputeUseCases(db)
        return use_cases.create_dispute(dto)
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{debt_id}/repay", response_model=DisputeResponseDTO)
def repay_debt(
    debt_id: int,
    dto: RepayDebtDTO,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["SUPER_ADMIN"])),
):
    try:
        use_cases = DisputeUseCases(db)
        return use_cases.repay_debt(debt_id, dto, user_id=current_user.id)
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{debt_id}/force-majeure", response_model=DisputeResponseDTO)
def cancel_force_majeure(
    debt_id: int,
    dto: CancelForceMajeureDTO,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["SUPER_ADMIN"])),
):
    try:
        use_cases = DisputeUseCases(db)
        return use_cases.cancel_under_force_majeure(debt_id, dto.police_report)
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
