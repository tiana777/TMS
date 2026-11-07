"""Tour REST Router."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.application.dtos.other_dtos import CloseTourDTO, CreateTourDTO, TourResponseDTO
from backend.app.application.use_cases.tour_use_cases import TourUseCases
from backend.app.domain.exceptions import DomainException
from backend.app.infrastructure.database.connection import get_db
from backend.app.infrastructure.persistence.models import TourORM, UserORM
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


@router.get("", response_model=List[TourResponseDTO])
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
    return [
        TourResponseDTO(
            id=o.id,
            tour_date=o.date_tournee,
            courier_id=o.livreur_id,
            status=o.statut,
            theoretical_total=int(o.total_theorique_caisse),
            actual_remitted=int(o.total_reel_verse),
            discrepancy=int(o.ecart_constate),
            closed_at=o.cloture_a.isoformat() if o.cloture_a else None,
        )
        for o in orms
    ]
