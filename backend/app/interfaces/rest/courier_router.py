"""Courier REST Router."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.application.dtos.other_dtos import (
    CourierResponseDTO,
    CreateCourierDTO,
    ScorecardResponseDTO,
    UpdateCourierCapacityDTO,
)
from backend.app.application.use_cases.tour_use_cases import CourierUseCases
from backend.app.domain.exceptions import DomainException
from backend.app.infrastructure.database.connection import get_db
from backend.app.infrastructure.persistence.models import UserORM
from backend.app.infrastructure.security.auth import get_current_user, require_roles

router = APIRouter(prefix="/couriers", tags=["Livreurs & Performance"])


@router.get("", response_model=List[CourierResponseDTO])
def list_couriers(
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(get_current_user),
):
    use_cases = CourierUseCases(db)
    return use_cases.list_couriers()


@router.post("", response_model=CourierResponseDTO, status_code=status.HTTP_201_CREATED)
def create_courier(
    dto: CreateCourierDTO,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["SUPER_ADMIN"])),
):
    try:
        use_cases = CourierUseCases(db)
        return use_cases.create_courier(dto)
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/scorecards/leaderboard", response_model=List[ScorecardResponseDTO])
def get_fleet_leaderboard(
    period: str,  # YYYY-MM
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(get_current_user),
):
    try:
        use_cases = CourierUseCases(db)
        return use_cases.compute_fleet_leaderboard(period)
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{courier_id}/capacity", response_model=CourierResponseDTO)
def update_courier_capacity(
    courier_id: int,
    dto: UpdateCourierCapacityDTO,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(get_current_user),
):
    try:
        use_cases = CourierUseCases(db)
        return use_cases.update_courier_capacity(courier_id, dto.max_parcels)
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{courier_id}/scorecard", response_model=ScorecardResponseDTO)
def get_scorecard(
    courier_id: int,
    period: str,  # YYYY-MM
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(get_current_user),
):
    try:
        use_cases = CourierUseCases(db)
        return use_cases.compute_scorecard(courier_id, period)
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
