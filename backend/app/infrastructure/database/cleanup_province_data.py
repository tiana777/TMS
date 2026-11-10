"""Script to clean up province test data, extra province axes, and surplus test parcels.
Restores clean single AXE_PROVINCE state per CDC specifications.
"""

from sqlalchemy import text
from backend.app.infrastructure.database.connection import SessionLocal, engine
from backend.app.infrastructure.persistence.models import (
    AxisORM,
    ZoneORM,
    ParcelORM,
    ParcelStatusHistoryORM,
    CashCollectionORM,
    PartnerORM,
    CourierORM,
)

CORE_PARTNER_NAMES = [
    "Gare Routière Ambodivona",
    "Gare Routière Fasan'ny Karana",
    "Gare Routière Andohatapenaka (Maki)",
    "Cotisse Transport",
    "Kofmad Transport",
    "Besady Plus",
    "Trans Texpress",
]

def clean_province_database():
    db = SessionLocal()
    try:
        print("=== 1. Cleaning Province Test Parcels ===")
        # Find all parcels where axe is AXE_PROVINCE or starts with AXE_PROV
        prov_parcels = db.query(ParcelORM).filter(
            (ParcelORM.axe == "AXE_PROVINCE") | (ParcelORM.axe.like("AXE_PROV%"))
        ).all()
        p_ids = [p.id for p in prov_parcels]
        print(f"Found {len(p_ids)} province parcels to clean up.")

        if p_ids:
            # Delete linked history
            deleted_hist = db.query(ParcelStatusHistoryORM).filter(
                ParcelStatusHistoryORM.colis_id.in_(p_ids)
            ).delete(synchronize_session=False)
            print(f"Deleted {deleted_hist} status history entries.")

            # Delete linked cash collections
            deleted_cash = db.query(CashCollectionORM).filter(
                CashCollectionORM.colis_id.in_(p_ids)
            ).delete(synchronize_session=False)
            print(f"Deleted {deleted_cash} cash collection entries.")

            # Delete parcels
            deleted_parcels = db.query(ParcelORM).filter(
                ParcelORM.id.in_(p_ids)
            ).delete(synchronize_session=False)
            print(f"Deleted {deleted_parcels} province parcels.")

        print("\n=== 2. Cleaning Extra Province Axes & Zones ===")
        # The 7 extra province axes
        extra_axes = db.query(AxisORM).filter(
            AxisORM.code.in_([
                "AXE_PROV_RN2_EST",
                "AXE_PROV_RN4_OUEST",
                "AXE_PROV_RN6_NORD",
                "AXE_PROV_RN7_SUD",
                "AXE_PROV_RN7_SUD_OUEST",
                "AXE_PROV_SUD_EST",
                "AXE_PROV_RN44_ALAOTRA",
            ])
        ).all()

        extra_axis_ids = [a.id for a in extra_axes]
        if extra_axis_ids:
            deleted_zones = db.query(ZoneORM).filter(
                ZoneORM.axe_id.in_(extra_axis_ids)
            ).delete(synchronize_session=False)
            print(f"Deleted {deleted_zones} zones attached to extra province axes.")

            deleted_axes = db.query(AxisORM).filter(
                AxisORM.id.in_(extra_axis_ids)
            ).delete(synchronize_session=False)
            print(f"Deleted {deleted_axes} extra province axes.")

        # Ensure single canonical AXE_PROVINCE exists and is active
        canon_axe = db.query(AxisORM).filter(AxisORM.code == "AXE_PROVINCE").first()
        if canon_axe:
            canon_axe.type_axe = "PROVINCE"
            canon_axe.libelle = "AXE PROVINCES & GARES ROUTIÈRES (Coopératives)"
            canon_axe.actif = 1
            print("Canonical AXE_PROVINCE verified and active.")
        else:
            canon_axe = AxisORM(
                code="AXE_PROVINCE",
                libelle="AXE PROVINCES & GARES ROUTIÈRES (Coopératives)",
                type_axe="PROVINCE",
                actif=1,
            )
            db.add(canon_axe)
            print("Canonical AXE_PROVINCE created.")

        print("\n=== 3. Cleaning Extra Province Partners ===")
        # Remove extra partners that are not in core CDC list
        extra_partners = db.query(PartnerORM).filter(
            ~PartnerORM.nom.in_(CORE_PARTNER_NAMES)
        ).all()
        print(f"Found {len(extra_partners)} non-core partners to remove.")
        for p in extra_partners:
            # Check if any parcel still links to this partner
            ref_count = db.query(ParcelORM).filter(ParcelORM.partenaire_id == p.id).count()
            if ref_count == 0:
                db.delete(p)
        print("Non-core partners cleaned up.")

        print("\n=== 4. Updating Couriers Capacity to 30 Colis ===")
        # Set couriers capacity to 30 colis max
        all_couriers = db.query(CourierORM).all()
        for c in all_couriers:
            c.capacite_max_colis = 30
        print(f"Updated {len(all_couriers)} couriers to capacity 30.")

        db.commit()
        print("\n=== Database province cleanup completed successfully! ===")
    except Exception as e:
        db.rollback()
        print(f"Error during cleanup: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    clean_province_database()
