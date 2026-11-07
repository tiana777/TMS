"""Parcel REST Router."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.application.dtos.parcel_dtos import (
    CreateBatchParcelDTO,
    CreateParcelDTO,
    ParcelResponseDTO,
    UpdateParcelStatusDTO,
)
from backend.app.application.use_cases.parcel_use_cases import ParcelUseCases
from backend.app.domain.exceptions import DomainException
from backend.app.infrastructure.database.connection import get_db
from backend.app.infrastructure.persistence.models import UserORM
from backend.app.infrastructure.security.auth import get_current_user, require_roles

router = APIRouter(prefix="/parcels", tags=["Colis & Inbound"])


@router.post("", response_model=ParcelResponseDTO, status_code=status.HTTP_201_CREATED)
def create_parcel(
    dto: CreateParcelDTO,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["RECEPTIONNISTE", "SUPERVISEUR", "SUPER_ADMIN"])),
):
    try:
        use_cases = ParcelUseCases(db)
        return use_cases.create_parcel(dto)
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/batch", response_model=List[ParcelResponseDTO], status_code=status.HTTP_201_CREATED)
def create_batch_parcels(
    dto: CreateBatchParcelDTO,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["RECEPTIONNISTE", "SUPERVISEUR", "SUPER_ADMIN"])),
):
    try:
        use_cases = ParcelUseCases(db)
        return use_cases.create_batch(dto)
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=List[ParcelResponseDTO])
def list_parcels(
    status: Optional[str] = None,
    axis: Optional[str] = None,
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(get_current_user),
):
    use_cases = ParcelUseCases(db)
    return use_cases.list_parcels(status=status, axis=axis, date_str=date)


@router.get("/{parcel_id}", response_model=ParcelResponseDTO)
def get_parcel(
    parcel_id: int,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(get_current_user),
):
    use_cases = ParcelUseCases(db)
    parcel = use_cases.get_parcel(parcel_id)
    if not parcel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colis introuvable.")
    return parcel


@router.patch("/{parcel_id}/status", response_model=ParcelResponseDTO)
def update_parcel_status(
    parcel_id: int,
    dto: UpdateParcelStatusDTO,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["SUPERVISEUR", "SUPER_ADMIN"])),
):
    try:
        use_cases = ParcelUseCases(db)
        return use_cases.update_status(parcel_id, dto, user_id=current_user.id)
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
