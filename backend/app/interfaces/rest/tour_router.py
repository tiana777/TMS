"""Tour REST Router."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.application.dtos.other_dtos import (
    CloseTourDTO,
    CreateTourDTO,
    TourDetailResponseDTO,
    TourResponseDTO,
)
from backend.app.application.use_cases.tour_use_cases import TourUseCases
from backend.app.domain.exceptions import DomainException
from backend.app.infrastructure.database.connection import get_db
from backend.app.infrastructure.persistence.models import CourierORM, ParcelORM, TourORM, UserORM
from backend.app.infrastructure.security.auth import get_current_user, require_roles

router = APIRouter(prefix="/tours", tags=["Tournées & Dispatch"])


@router.post("", response_model=TourResponseDTO, status_code=status.HTTP_201_CREATED)
def create_tour(
    dto: CreateTourDTO,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["SUPERVISEUR", "SUPER_ADMIN"])),
):
    try:
        use_cases = TourUseCases(db)
        return use_cases.create_or_assign_tour(dto.courier_id, dto.tour_date, dto.parcel_ids)
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{tour_id}", response_model=TourDetailResponseDTO)
def get_tour_detail(
    tour_id: int,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(get_current_user),
):
    try:
        use_cases = TourUseCases(db)
        return use_cases.get_tour_detail(tour_id)
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{tour_id}/start", response_model=TourDetailResponseDTO)
def start_tour(
    tour_id: int,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["SUPERVISEUR", "SUPER_ADMIN"])),
):
    try:
        use_cases = TourUseCases(db)
        return use_cases.start_tour(tour_id)
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{tour_id}/unassign/{parcel_id}", response_model=TourDetailResponseDTO)
def unassign_parcel_from_tour(
    tour_id: int,
    parcel_id: int,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["SUPERVISEUR", "SUPER_ADMIN"])),
):
    try:
        use_cases = TourUseCases(db)
        return use_cases.unassign_parcel(tour_id, parcel_id)
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{tour_id}/close", response_model=TourResponseDTO)
def close_tour(
    tour_id: int,
    dto: CloseTourDTO,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["SUPER_ADMIN"])),
):
    try:
        use_cases = TourUseCases(db)
        return use_cases.close_tour(tour_id, dto)
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=List[TourDetailResponseDTO])
def list_tours(
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(get_current_user),
):
    q = db.query(TourORM)
    if date:
        q = q.filter(TourORM.date_tournee == date)
    orms = q.order_by(TourORM.id.desc()).all()
    use_cases = TourUseCases(db)
    return [use_cases.get_tour_detail(o.id) for o in orms]

