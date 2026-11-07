"""Database initialization and master data seeding according to CDC sections 3, 5, 6 & 12."""

import hashlib
from backend.app.infrastructure.database.connection import Base, engine, SessionLocal
from backend.app.infrastructure.persistence.models import (
    AxisORM,
    CourierORM,
    PartnerORM,
    UserORM,
    VendorORM,
    ZoneORM,
)


def hash_password(password: str) -> str:
    """Simple secure SHA-256 hash for seed demonstration."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def seed_master_data():
    """Initializes schema and populates master reference data."""
    print("Creating all tables in PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")

    session = SessionLocal()
    try:
        # 1. Seed Users if not present
        if not session.query(UserORM).first():
            print("Seeding users...")
            users = [
                UserORM(
                    username="admin",
                    email="admin@tmsexpress.mg",
                    role="SUPER_ADMIN",
                    nom_complet="Direction Générale TMS",
                    mot_de_passe_hash=hash_password("admin123"),
                    actif=1,
                ),
                UserORM(
                    username="superviseur",
                    email="superviseur@tmsexpress.mg",
                    role="SUPERVISEUR",
                    nom_complet="Chef de Quai Dispatcher",
                    mot_de_passe_hash=hash_password("super123"),
                    actif=1,
                ),
                UserORM(
                    username="reception",
                    email="reception@tmsexpress.mg",
                    role="RECEPTIONNISTE",
                    nom_complet="Agent Accueil Inbound",
                    mot_de_passe_hash=hash_password("recep123"),
                    actif=1,
                ),
            ]
            session.add_all(users)
            session.commit()
            print("Users seeded.")

        # 2. Seed the 8 Logistic Axes & Zones
        if not session.query(AxisORM).first():
            print("Seeding 8 Logistic Axes and zones...")
            axes_data = [
                (
                    "AXE_CENTRE",
                    "AXE CENTRE-VILLE (Tsiazotafo & Hyper-Centre)",
                    [
                        "Analakely", "Antaninarenina", "Isoraka", "Tsaralalàna",
                        "Behoririka", "Mahamasina", "Faravohitra", "Ambohijatovo",
                        "Antsahabe", "Tsiazotafo"
                    ]
                ),
                (
                    "AXE_RN1",
                    "AXE RN1 OUEST (Tsiazotafo ➔ Itaosy / Ampitatafika)",
                    [
                        "67Ha", "Ampefiloha", "Anosizato", "Ambodin'isotry",
                        "Itaosy", "Cité Seimad", "Ampitatafika", "Fenoarivo"
                    ]
                ),
                (
                    "AXE_RN2",
                    "AXE RN2 EST (Tsiazotafo ➔ Ambohimangakely)",
                    [
                        "Besarety", "Mahavoky", "Avaradoha", "Ampasapito",
                        "Nanisana", "Ankadindramamy", "Mahazo", "Ambohimahitsy",
                        "Ambohimangakely"
                    ]
                ),
                (
                    "AXE_RN3",
                    "AXE RN3 NORD (Tsiazotafo ➔ Sabotsy Namehana)",
                    [
                        "Andravoahangy", "Amboditsiry", "Analamahitsy", "Ilafy",
                        "Sabotsy Namehana", "Manjakaray", "Anjanahary"
                    ]
                ),
                (
                    "AXE_RN4",
                    "AXE RN4 / DIGUE (Tsiazotafo ➔ Ivato Aéroport)",
                    [
                        "Antanimena", "Ankorondrano", "Andraharo Zone Galaxy",
                        "Alarobia", "Ambohimanarina", "Ambohibao", "Talatamaty",
                        "Mandrosoa", "Ivato"
                    ]
                ),
                (
                    "AXE_RN7",
                    "AXE RN7 SUD (Tsiazotafo ➔ Iavoloha / Andoharanofotsy)",
                    [
                        "Ankadimbahoaka", "Tanjombato", "Andoharanofotsy",
                        "Iavoloha", "Ambohimanambola"
                    ]
                ),
                (
                    "AXE_SUD_EST",
                    "AXE SUD-EST (Tsiazotafo ➔ Ankatso / Alasora)",
                    [
                        "Ambanidia", "Mandroseza", "Ankatso", "Tsiadana",
                        "Ambatoroka", "Befelatanana", "Alasora", "By-Pass"
                    ]
                ),
                (
                    "AXE_PROVINCE",
                    "AXE PROVINCES & GARES ROUTIÈRES (Coopératives Régionales)",
                    [
                        "Toamasina", "Mahajanga", "Antsirabe", "Fianarantsoa",
                        "Toliara", "Diego", "Moramanga", "Sambava", "Nosy Be",
                        "Fort-Dauphin"
                    ]
                ),
            ]

            for code, libelle, zones_list in axes_data:
                axis = AxisORM(code=code, libelle=libelle, actif=1)
                session.add(axis)
                session.flush()

                for z in zones_list:
                    zone = ZoneORM(axe_id=axis.id, nom=z)
                    session.add(zone)

            session.commit()
            print("Axes and zones seeded.")

        # 3. Seed Partners (Gares & Cooperatives)
        if not session.query(PartnerORM).first():
            print("Seeding partner stations and cooperatives...")
            partners = [
                # Stations (Gares)
                PartnerORM(
                    nom="Gare Routière Ambodivona",
                    contact="034 00 111 22",
                    type="GARE",
                    gare_rattachement="Ambodivona",
                    actif=1,
                ),
                PartnerORM(
                    nom="Gare Routière Fasan'ny Karana",
                    contact="032 00 222 33",
                    type="GARE",
                    gare_rattachement="Fasan'ny Karana",
                    actif=1,
                ),
                PartnerORM(
                    nom="Gare Routière Andohatapenaka (Maki)",
                    contact="033 00 333 44",
                    type="GARE",
                    gare_rattachement="Andohatapenaka",
                    actif=1,
                ),
                # Cooperatives
                PartnerORM(
                    nom="Cotisse Transport",
                    contact="032 11 025 00",
                    type="COOPERATIVE",
                    gare_rattachement="Ambodivona",
                    actif=1,
                ),
                PartnerORM(
                    nom="Kofmad Transport",
                    contact="034 22 555 88",
                    type="COOPERATIVE",
                    gare_rattachement="Fasan'ny Karana",
                    actif=1,
                ),
                PartnerORM(
                    nom="Besady Plus",
                    contact="033 15 444 77",
                    type="COOPERATIVE",
                    gare_rattachement="Andohatapenaka",
                    actif=1,
                ),
                PartnerORM(
                    nom="Trans Texpress",
                    contact="034 88 999 00",
                    type="COOPERATIVE",
                    gare_rattachement="Ambodivona",
                    actif=1,
                ),
            ]
            session.add_all(partners)
            session.commit()
            print("Partners seeded.")

        # 4. Seed initial Couriers
        if not session.query(CourierORM).first():
            print("Seeding initial couriers...")
            couriers = [
                CourierORM(
                    nom="Rakoto Jean (Livreur 01)",
                    telephone="0341234567",
                    type_vehicule="Scooter 110cc",
                    caution_garantie=150000.0,
                    actif=1,
                ),
                CourierORM(
                    nom="Rabe Michel (Livreur 02)",
                    telephone="0321122334",
                    type_vehicule="Scooter 125cc",
                    caution_garantie=150000.0,
                    actif=1,
                ),
                CourierORM(
                    nom="Randria Paul (Navette Gares)",
                    telephone="0334455667",
                    type_vehicule="Fourgonnette Navette Transit",
                    caution_garantie=300000.0,
                    actif=1,
                ),
            ]
            session.add_all(couriers)
            session.commit()
            print("Couriers seeded.")

        # 5. Seed initial Cybermarchands
        if not session.query(VendorORM).first():
            print("Seeding initial cybermarchands...")
            vendors = [
                VendorORM(
                    nom="Mod'Tanà Boutique",
                    telephone="0345566778",
                    contact_responsable="Madame Voahirana",
                    modalite_paiement="COMPTANT",
                    actif=1,
                ),
                VendorORM(
                    nom="Tech Express Madagascar",
                    telephone="0329988776",
                    contact_responsable="Monsieur Andry",
                    modalite_paiement="COMPTANT",
                    actif=1,
                ),
                VendorORM(
                    nom="Parfumerie Tsara",
                    telephone="0331234599",
                    contact_responsable="Madame Sarah",
                    modalite_paiement="COMPTANT",
                    actif=1,
                ),
            ]
            session.add_all(vendors)
            session.commit()
            print("Vendors seeded.")

        print("Master reference data seeded successfully.")
    finally:
        session.close()


if __name__ == "__main__":
    seed_master_data()
