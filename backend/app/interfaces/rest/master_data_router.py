"""Master Reference Data REST Router (Axes, Zones, Partners, Vendors)."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.infrastructure.database.connection import get_db
from backend.app.infrastructure.persistence.models import (
    AxisORM,
    PartnerORM,
    UserORM,
    VendorORM,
    ZoneORM,
)
from backend.app.infrastructure.security.auth import require_roles

router = APIRouter(prefix="/master", tags=["Référentiel Métier"])


class ZoneResponseDTO(BaseModel):
    id: int
    nom: str


class ZoneDetailDTO(BaseModel):
    id: int
    nom: str


class AxisResponseDTO(BaseModel):
    id: int
    code: str
    libelle: str
    type_axe: str = "URBAIN"
    actif: int = 1
    zones: List[str]
    zones_detail: List[ZoneDetailDTO] = []


class CreateAxisInputDTO(BaseModel):
    code: str
    libelle: str
    type_axe: str = "URBAIN"  # URBAIN or PROVINCE
    zones: Optional[List[str]] = []


class UpdateAxisInputDTO(BaseModel):
    code: Optional[str] = None
    libelle: Optional[str] = None
    type_axe: Optional[str] = None
    actif: Optional[int] = None


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


class CreatePartnerInputDTO(BaseModel):
    nom: str
    contact: Optional[str] = None
    type: str  # COOPERATIVE, GARE, CONFRERE
    gare_rattachement: Optional[str] = None


class CreateZoneInputDTO(BaseModel):
    nom: str


class UpdateVendorInputDTO(BaseModel):
    nom: Optional[str] = None
    type_expediteur: Optional[str] = None
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    email: Optional[str] = None
    contact_responsable: Optional[str] = None
    nif_stat: Optional[str] = None
    modalite_paiement: Optional[str] = None
    actif: Optional[int] = None


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
def get_axes(type_axe: Optional[str] = None, actif: Optional[int] = 1, db: Session = Depends(get_db)):
    q = db.query(AxisORM)
    if actif is not None:
        q = q.filter(AxisORM.actif == actif)
    if type_axe:
        q = q.filter(AxisORM.type_axe == type_axe.upper())
    axes = q.order_by(AxisORM.id.asc()).all()
    results = []
    for a in axes:
        zones_detail = [ZoneDetailDTO(id=z.id, nom=z.nom) for z in a.zones]
        zones = [z.nom for z in a.zones]
        results.append(
            AxisResponseDTO(
                id=a.id,
                code=a.code,
                libelle=a.libelle,
                type_axe=a.type_axe or ("PROVINCE" if "PROVINCE" in a.code else "URBAIN"),
                actif=a.actif,
                zones=zones,
                zones_detail=zones_detail,
            )
        )
    return results


@router.post("/axes", response_model=AxisResponseDTO, status_code=201)
def create_axis(
    data: CreateAxisInputDTO,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["SUPER_ADMIN", "SUPERVISEUR"])),
):
    clean_code = data.code.strip().upper()
    if not clean_code:
        raise HTTPException(status_code=400, detail="Le code de l'axe est obligatoire.")
    if not clean_code.startswith("AXE_"):
        clean_code = f"AXE_{clean_code}"

    existing = db.query(AxisORM).filter(AxisORM.code == clean_code).first()
    if existing:
        if existing.actif == 0:
            existing.actif = 1
            existing.libelle = data.libelle.strip() or existing.libelle
            existing.type_axe = data.type_axe.upper()
            db.commit()
            db.refresh(existing)
            zones_detail = [ZoneDetailDTO(id=z.id, nom=z.nom) for z in existing.zones]
            return AxisResponseDTO(
                id=existing.id,
                code=existing.code,
                libelle=existing.libelle,
                type_axe=existing.type_axe or "URBAIN",
                actif=existing.actif,
                zones=[z.nom for z in existing.zones],
                zones_detail=zones_detail,
            )
        raise HTTPException(status_code=400, detail=f"L'axe avec le code '{clean_code}' existe déjà.")

    axis = AxisORM(
        code=clean_code,
        libelle=data.libelle.strip(),
        type_axe=data.type_axe.upper() if data.type_axe else "URBAIN",
        actif=1,
    )
    db.add(axis)
    db.commit()
    db.refresh(axis)

    if data.zones:
        for z_name in data.zones:
            name_clean = z_name.strip()
            if name_clean:
                existing_z = db.query(ZoneORM).filter(ZoneORM.nom == name_clean).first()
                if existing_z:
                    existing_z.axe_id = axis.id
                else:
                    z = ZoneORM(axe_id=axis.id, nom=name_clean)
                    db.add(z)
        db.commit()
        db.refresh(axis)

    zones_detail = [ZoneDetailDTO(id=z.id, nom=z.nom) for z in axis.zones]
    return AxisResponseDTO(
        id=axis.id,
        code=axis.code,
        libelle=axis.libelle,
        type_axe=axis.type_axe or "URBAIN",
        actif=axis.actif,
        zones=[z.nom for z in axis.zones],
        zones_detail=zones_detail,
    )


@router.patch("/axes/{axis_id}", response_model=AxisResponseDTO)
def update_axis(
    axis_id: int,
    data: UpdateAxisInputDTO,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["SUPER_ADMIN", "SUPERVISEUR"])),
):
    axis = db.query(AxisORM).filter(AxisORM.id == axis_id).first()
    if not axis:
        raise HTTPException(status_code=404, detail="Axe introuvable.")

    if data.code is not None:
        clean_code = data.code.strip().upper()
        if clean_code and clean_code != axis.code:
            existing = db.query(AxisORM).filter(AxisORM.code == clean_code, AxisORM.id != axis_id).first()
            if existing:
                raise HTTPException(status_code=400, detail=f"Un axe avec le code '{clean_code}' existe déjà.")
            axis.code = clean_code

    if data.libelle is not None:
        axis.libelle = data.libelle.strip()
    if data.type_axe is not None:
        axis.type_axe = data.type_axe.upper()
    if data.actif is not None:
        axis.actif = data.actif

    db.commit()
    db.refresh(axis)
    zones_detail = [ZoneDetailDTO(id=z.id, nom=z.nom) for z in axis.zones]
    return AxisResponseDTO(
        id=axis.id,
        code=axis.code,
        libelle=axis.libelle,
        type_axe=axis.type_axe or "URBAIN",
        actif=axis.actif,
        zones=[z.nom for z in axis.zones],
        zones_detail=zones_detail,
    )


@router.delete("/axes/{axis_id}")
def delete_axis(
    axis_id: int,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["SUPER_ADMIN", "SUPERVISEUR"])),
):
    axis = db.query(AxisORM).filter(AxisORM.id == axis_id).first()
    if not axis:
        raise HTTPException(status_code=404, detail="Axe introuvable.")

    axis.actif = 0  # Soft delete compliant with CDC section 14
    db.commit()
    return {"success": True, "message": f"Axe '{axis.code}' désactivé avec succès."}


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


@router.patch("/vendors/{vendor_id}", response_model=VendorResponseDTO)
def update_vendor(vendor_id: int, data: UpdateVendorInputDTO, db: Session = Depends(get_db)):
    v = db.query(VendorORM).filter(VendorORM.id == vendor_id).first()
    if not v:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Expéditeur introuvable")

    if data.nom is not None:
        v.nom = data.nom
    if data.type_expediteur is not None:
        v.type_expediteur = data.type_expediteur
    if data.telephone is not None:
        v.telephone = data.telephone
    if data.adresse is not None:
        v.adresse = data.adresse
    if data.email is not None:
        v.email = data.email
    if data.contact_responsable is not None:
        v.contact_responsable = data.contact_responsable
    if data.nif_stat is not None:
        v.nif_stat = data.nif_stat
    if data.modalite_paiement is not None:
        v.modalite_paiement = data.modalite_paiement
    if data.actif is not None:
        v.actif = data.actif

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


@router.post("/partners", response_model=PartnerResponseDTO, status_code=201)
def create_partner(data: CreatePartnerInputDTO, db: Session = Depends(get_db)):
    p = PartnerORM(
        nom=data.nom,
        contact=data.contact,
        type=data.type,
        gare_rattachement=data.gare_rattachement,
        actif=1,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return PartnerResponseDTO(
        id=p.id,
        nom=p.nom,
        contact=p.contact,
        type=p.type,
        gare_rattachement=p.gare_rattachement,
    )


@router.post("/axes/{axis_id}/zones", response_model=AxisResponseDTO)
def add_zone_to_axis(
    axis_id: int,
    data: CreateZoneInputDTO,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["SUPER_ADMIN", "SUPERVISEUR"])),
):
    axis = db.query(AxisORM).filter(AxisORM.id == axis_id).first()
    if not axis:
        raise HTTPException(status_code=404, detail="Axe introuvable")

    existing_zone = db.query(ZoneORM).filter(ZoneORM.nom == data.nom.strip()).first()
    if existing_zone:
        if existing_zone.axe_id != axis.id:
            existing_zone.axe_id = axis.id
            db.commit()
    else:
        zone = ZoneORM(axe_id=axis.id, nom=data.nom.strip())
        db.add(zone)
        db.commit()

    db.refresh(axis)
    zones_detail = [ZoneDetailDTO(id=z.id, nom=z.nom) for z in axis.zones]
    return AxisResponseDTO(
        id=axis.id,
        code=axis.code,
        libelle=axis.libelle,
        type_axe=axis.type_axe or "URBAIN",
        actif=axis.actif,
        zones=[z.nom for z in axis.zones],
        zones_detail=zones_detail,
    )


@router.delete("/axes/{axis_id}/zones/{zone_id}", response_model=AxisResponseDTO)
def remove_zone_from_axis(
    axis_id: int,
    zone_id: int,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(require_roles(["SUPER_ADMIN", "SUPERVISEUR"])),
):
    axis = db.query(AxisORM).filter(AxisORM.id == axis_id).first()
    if not axis:
        raise HTTPException(status_code=404, detail="Axe introuvable.")

    zone = db.query(ZoneORM).filter(ZoneORM.id == zone_id, ZoneORM.axe_id == axis_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Quartier/Zone introuvable pour cet axe.")

    db.delete(zone)
    db.commit()
    db.refresh(axis)
    zones_detail = [ZoneDetailDTO(id=z.id, nom=z.nom) for z in axis.zones]
    return AxisResponseDTO(
        id=axis.id,
        code=axis.code,
        libelle=axis.libelle,
        type_axe=axis.type_axe or "URBAIN",
        actif=axis.actif,
        zones=[z.nom for z in axis.zones],
        zones_detail=zones_detail,
    )
