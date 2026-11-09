"""FastAPI REST Router for Vendor Payouts & Financial Remittances (CDC sections 3, 9 & 13.3)."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.application.dtos.payout_dtos import (
    CreatePayoutDTO,
    PayoutResponseDTO,
    PendingPayoutSummaryDTO,
)
from backend.app.application.use_cases.payout_use_cases import PayoutUseCases
from backend.app.domain.exceptions import BusinessRuleViolationException, EntityNotFoundException
from backend.app.infrastructure.database.connection import get_db
from backend.app.infrastructure.security.auth import get_current_user, require_roles
from backend.app.infrastructure.persistence.models import UserORM

router = APIRouter(prefix="/payouts", tags=["Reversements & Relevés Cybermarchands"])


@router.get("/pending", response_model=List[PendingPayoutSummaryDTO])
def get_pending_payouts(
    vendor_id: Optional[int] = Query(None, description="Filtrer par donneur d'ordre"),
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(get_current_user),
):
    """Calcule les montants en attente de reversement aux vendeurs (colis livrés & encaissés non encore reversés)."""
    use_cases = PayoutUseCases(db)
    return use_cases.get_pending_payouts(vendor_id=vendor_id)


@router.get("/pending/{vendor_id}", response_model=PendingPayoutSummaryDTO)
def get_pending_payout_for_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(get_current_user),
):
    """Détail des colis et montants exigibles pour un donneur d'ordre spécifique."""
    use_cases = PayoutUseCases(db)
    results = use_cases.get_pending_payouts(vendor_id=vendor_id)
    if not results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aucun reversement en attente ou donneur d'ordre introuvable pour l'ID {vendor_id}",
        )
    return results[0]


@router.post("", response_model=PayoutResponseDTO, status_code=status.HTTP_201_CREATED)
def create_payout(
    dto: CreatePayoutDTO,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(get_current_user),
):
    """Émet et valide un bordereau officiel de reversement financier avec verrouillage comptable des colis (CDC §13.3)."""
    if current_user.role not in ["SUPER_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul le Super Admin (Responsable Caisse) est habilité à ordonnancer et valider un reversement vendeur (CDC §3.4).",
        )

    try:
        use_cases = PayoutUseCases(db)
        return use_cases.create_payout(dto, current_user_id=current_user.id)
    except EntityNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except BusinessRuleViolationException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=List[PayoutResponseDTO])
def get_all_payouts(
    vendor_id: Optional[int] = Query(None, description="Filtrer par donneur d'ordre"),
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(get_current_user),
):
    """Historique des bordereaux de reversement émis."""
    use_cases = PayoutUseCases(db)
    return use_cases.get_payouts(vendor_id=vendor_id)


@router.get("/{payout_id}", response_model=PayoutResponseDTO)
def get_payout_by_id(
    payout_id: int,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(get_current_user),
):
    """Récupère un bordereau officiel de reversement complet par son identifiant unique."""
    try:
        use_cases = PayoutUseCases(db)
        return use_cases.get_payout_by_id(payout_id)
    except EntityNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
