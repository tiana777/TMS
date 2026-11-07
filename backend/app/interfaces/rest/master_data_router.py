"""Master Reference Data REST Router (Axes, Zones, Partners, Vendors)."""

from typing import List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.infrastructure.database.connection import get_db
from backend.app.infrastructure.persistence.models import (
    AxisORM,
    PartnerORM,
    VendorORM,
    ZoneORM,
)

router = APIRouter(prefix="/master", tags=["Référentiel Métier"])


class ZoneResponseDTO(BaseModel):
    id: int
    nom: str


class AxisResponseDTO(BaseModel):
    id: int
    code: str
    libelle: str
    zones: List[str]


class PartnerResponseDTO(BaseModel):
    id: int
    nom: str
    contact: Optional[str] = None
    type: str
    gare_rattachement: Optional[str] = None


class VendorResponseDTO(BaseModel):
    id: int
    nom: str
    telephone: Optional[str] = None
    contact_responsable: Optional[str] = None
    modalite_paiement: str


@router.get("/axes", response_model=List[AxisResponseDTO])
def get_axes(db: Session = Depends(get_db)):
    axes = db.query(AxisORM).filter(AxisORM.actif == 1).order_by(AxisORM.id.asc()).all()
    results = []
    for a in axes:
        zones = [z.nom for z in a.zones]
        results.append(AxisResponseDTO(id=a.id, code=a.code, libelle=a.libelle, zones=zones))
    return results


@router.get("/partners", response_model=List[PartnerResponseDTO])
def get_partners(type: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(PartnerORM).filter(PartnerORM.actif == 1)
    if type:
        q = q.filter(PartnerORM.type == type)
    partners = q.order_by(PartnerORM.nom.asc()).all()
    return [
        PartnerResponseDTO(
            id=p.id,
            nom=p.nom,
            contact=p.contact,
            type=p.type,
            gare_rattachement=p.gare_rattachement,
        )
        for p in partners
    ]


@router.get("/vendors", response_model=List[VendorResponseDTO])
def get_vendors(db: Session = Depends(get_db)):
    vendors = db.query(VendorORM).filter(VendorORM.actif == 1).order_by(VendorORM.nom.asc()).all()
    return [
        VendorResponseDTO(
            id=v.id,
            nom=v.nom,
            telephone=v.telephone,
            contact_responsable=v.contact_responsable,
            modalite_paiement=v.modalite_paiement,
        )
        for v in vendors
    ]
