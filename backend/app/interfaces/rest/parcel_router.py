"""Parcel REST Router."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.application.dtos.parcel_dtos import (
    BulkCloseCashDTO,
    BulkDeleteParcelsDTO,
    CreateBatchParcelDTO,
    CreateParcelDTO,
    MarkPrepaidDTO,
    ParcelResponseDTO,
    ReassignParcelDTO,
    UpdateParcelAxisDTO,
    UpdateParcelContactDTO,
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
    tour_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(get_current_user),
):
    use_cases = ParcelUseCases(db)
    return use_cases.list_parcels(status=status, axis=axis, date_str=date, tour_id=tour_id)


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


@router.patch("/{parcel_id}/axis", response_model=ParcelResponseDTO)
def override_parcel_axis(
    parcel_id: int,
    dto: UpdateParcelAxisDTO,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["RECEPTIONNISTE", "SUPERVISEUR", "SUPER_ADMIN"])),
):
    try:
        use_cases = ParcelUseCases(db)
        return use_cases.override_parcel_axis(parcel_id, dto.axis)
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{parcel_id}/contact", response_model=ParcelResponseDTO)
def update_parcel_contact(
    parcel_id: int,
    dto: UpdateParcelContactDTO,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["RECEPTIONNISTE", "SUPERVISEUR", "SUPER_ADMIN"])),
):
    try:
        use_cases = ParcelUseCases(db)
        return use_cases.update_parcel_contact(
            parcel_id=parcel_id,
            recipient_phone=dto.recipient_phone,
            recipient_name=dto.recipient_name,
            delivery_address=dto.delivery_address,
            user_id=current_user.id,
        )
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{parcel_id}/reassign", response_model=ParcelResponseDTO)
def reassign_parcel(
    parcel_id: int,
    dto: ReassignParcelDTO,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["RECEPTIONNISTE", "SUPERVISEUR", "SUPER_ADMIN"])),
):
    try:
        use_cases = ParcelUseCases(db)
        return use_cases.reassign_parcel(
            parcel_id=parcel_id,
            courier_id=dto.courier_id,
            tour_id=dto.tour_id,
            tour_date=dto.tour_date,
            reason=dto.reason,
            user_role=current_user.role,
            user_id=current_user.id,
        )
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{parcel_id}/prepaid", response_model=ParcelResponseDTO)
def mark_parcel_prepaid(
    parcel_id: int,
    dto: MarkPrepaidDTO,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["RECEPTIONNISTE", "SUPERVISEUR", "SUPER_ADMIN"])),
):
    try:
        use_cases = ParcelUseCases(db)
        return use_cases.mark_as_prepaid(parcel_id, dto, user_id=current_user.id)
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/bulk-close-cash", response_model=List[ParcelResponseDTO])
def bulk_close_cash(
    dto: BulkCloseCashDTO,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["SUPER_ADMIN"])),
):
    """Validation groupée de l'encaissement effectif des fonds et clôture caisse."""
    try:
        use_cases = ParcelUseCases(db)
        results = []
        for pid in dto.parcel_ids:
            try:
                res = use_cases.update_status(
                    pid,
                    UpdateParcelStatusDTO(status="CLOTURE_CAISSE"),
                    user_id=current_user.id,
                )
                results.append(res)
            except Exception as ex:
                print(f"Warning bulk close cash parcel {pid}: {ex}")
        return results
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{parcel_id}", status_code=status.HTTP_200_OK)
def delete_parcel(
    parcel_id: int,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["SUPERVISEUR", "SUPER_ADMIN"])),
):
    """Suppression unitaire d'un colis. Réservé aux profils SUPERVISEUR et SUPER_ADMIN."""
    try:
        use_cases = ParcelUseCases(db)
        use_cases.delete_parcel(parcel_id, user_role=current_user.role, user_id=current_user.id)
        return {"success": True, "message": f"Colis #{parcel_id} supprimé avec succès."}
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/bulk-delete", status_code=status.HTTP_200_OK)
def bulk_delete_parcels(
    dto: BulkDeleteParcelsDTO,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["SUPERVISEUR", "SUPER_ADMIN"])),
):
    """Suppression groupée de colis sélectionnés. Réservé aux profils SUPERVISEUR et SUPER_ADMIN."""
    try:
        use_cases = ParcelUseCases(db)
        result = use_cases.delete_parcels(dto.parcel_ids, user_role=current_user.role, user_id=current_user.id)
        return result
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

