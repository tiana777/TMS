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
    type_expediteur: str = "CYBERMARCHAND"
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    email: Optional[str] = None
    contact_responsable: Optional[str] = None
    nif_stat: Optional[str] = None
    modalite_paiement: str


class CreateVendorInputDTO(BaseModel):
    nom: str
    type_expediteur: str = "CYBERMARCHAND"  # CYBERMARCHAND, PARTICULIER, ENTREPRISE
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    email: Optional[str] = None
    contact_responsable: Optional[str] = None
    nif_stat: Optional[str] = None
    modalite_paiement: str = "COMPTANT"


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
def get_vendors(type_expediteur: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(VendorORM).filter(VendorORM.actif == 1)
    if type_expediteur:
        q = q.filter(VendorORM.type_expediteur == type_expediteur)
    vendors = q.order_by(VendorORM.nom.asc()).all()
    return [
        VendorResponseDTO(
            id=v.id,
            nom=v.nom,
            type_expediteur=v.type_expediteur or "CYBERMARCHAND",
            telephone=v.telephone,
            adresse=v.adresse,
            email=v.email,
            contact_responsable=v.contact_responsable,
            nif_stat=v.nif_stat,
            modalite_paiement=v.modalite_paiement,
        )
        for v in vendors
    ]


@router.post("/vendors", response_model=VendorResponseDTO, status_code=201)
def create_vendor(data: CreateVendorInputDTO, db: Session = Depends(get_db)):
    v = VendorORM(
        nom=data.nom,
        type_expediteur=data.type_expediteur,
        telephone=data.telephone,
        adresse=data.adresse,
        email=data.email,
        contact_responsable=data.contact_responsable,
        nif_stat=data.nif_stat,
        modalite_paiement=data.modalite_paiement,
        actif=1,
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return VendorResponseDTO(
        id=v.id,
        nom=v.nom,
        type_expediteur=v.type_expediteur,
        telephone=v.telephone,
        adresse=v.adresse,
        email=v.email,
        contact_responsable=v.contact_responsable,
        nif_stat=v.nif_stat,
        modalite_paiement=v.modalite_paiement,
    )
