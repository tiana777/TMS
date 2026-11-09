"""Database initialization and master data seeding according to CDC sections 3, 5, 6 & 12."""

import hashlib
from sqlalchemy import text
from backend.app.infrastructure.database.connection import Base, engine, SessionLocal
from backend.app.infrastructure.persistence.models import (
    AxisORM,
    CourierORM,
    PartnerORM,
    UserORM,
    VendorORM,
    VendorPayoutORM,
    ZoneORM,
)


def hash_password(password: str) -> str:
    """Simple secure SHA-256 hash for seed demonstration."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def seed_master_data():
    """Initializes schema and populates master reference data."""
    print("Creating all tables in PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE colis DROP CONSTRAINT IF EXISTS colis_statut_check;"))
            conn.execute(text("""
                ALTER TABLE colis ADD CONSTRAINT colis_statut_check 
                CHECK (statut IN ('EN_DEPOT', 'ASSIGNE', 'EN_COURS', 'SOUS_TRAITE', 'LIVRE', 'ENCAISSE', 'LIVRE_ENCAISSE', 'REPORTE', 'ANNULE_RETOUR', 'RETOUR_BOUTIQUE', 'CLOTURE_CAISSE'));
            """))
            conn.execute(text("ALTER TABLE colis DROP CONSTRAINT IF EXISTS colis_mode_paiement_check;"))
            conn.execute(text("""
                ALTER TABLE colis ADD CONSTRAINT colis_mode_paiement_check 
                CHECK (mode_paiement IS NULL OR mode_paiement IN ('ESPECES', 'MVOLA', 'AIRTEL', 'ORANGE_MONEY', 'VIREMENT'));
            """))
            conn.execute(text("ALTER TABLE axes ADD COLUMN IF NOT EXISTS type_axe VARCHAR(30) DEFAULT 'URBAIN';"))
            conn.execute(text("UPDATE axes SET type_axe = 'PROVINCE' WHERE code LIKE '%PROVINCE%' AND (type_axe IS NULL OR type_axe != 'PROVINCE');"))
            conn.execute(text("ALTER TABLE colis ADD COLUMN IF NOT EXISTS reversement_id INTEGER REFERENCES reversements_vendeurs(id);"))
            conn.execute(text("ALTER TABLE colis ADD COLUMN IF NOT EXISTS statut_reversement VARCHAR(30) DEFAULT 'NON_REVERSE';"))
            conn.commit()
    except Exception as e:
        print(f"Notice during constraint update: {e}")
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
                type_axe = "PROVINCE" if "PROVINCE" in code else "URBAIN"
                axis = AxisORM(code=code, libelle=libelle, type_axe=type_axe, actif=1)
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
                    nom="Randria Paul (Livreur)",
                    telephone="0334455667",
                    type_vehicule="Moto 125cc",
                    caution_garantie=150000.0,
                    actif=1,
                ),
            ]
            session.add_all(couriers)
            session.commit()
            print("Couriers seeded.")

        # 5. Seed initial Expéditeurs / Donneurs d'Ordre (Cybermarchands, Particuliers, Entreprises)
        if not session.query(VendorORM).first():
            print("Seeding initial order givers (Cybermarchands, Particuliers, Entreprises)...")
            vendors = [
                VendorORM(
                    nom="Mod'Tanà Boutique",
                    type_expediteur="CYBERMARCHAND",
                    telephone="0345566778",
                    contact_responsable="Madame Voahirana",
                    adresse="Box 14, Pavillon Analakely",
                    email="contact@modtana.mg",
                    modalite_paiement="COMPTANT",
                    actif=1,
                ),
                VendorORM(
                    nom="Cabinet Juridique & Audit Tanà",
                    type_expediteur="ENTREPRISE",
                    telephone="0329988776",
                    contact_responsable="Maître Andry Rabemananjara",
                    adresse="Immeuble ARO, 3e étage, Antsakaviro",
                    email="contact@audit-tana.mg",
                    nif_stat="4001234567 / 2021",
                    modalite_paiement="FACTURE_MENSUELLE",
                    actif=1,
                ),
                VendorORM(
                    nom="Rasoamalala Hanta (Envoi Personnel)",
                    type_expediteur="PARTICULIER",
                    telephone="0331234599",
                    contact_responsable="Hanta Rasoamalala",
                    adresse="Lot IVG 34 Ambohimanarina",
                    email="hanta.rasoa@moov.mg",
                    modalite_paiement="COMPTANT",
                    actif=1,
                ),
            ]
            session.add_all(vendors)
            session.commit()
            print("Expéditeurs seeded.")

        print("Master reference data seeded successfully.")
    finally:
        session.close()

    # 6. Seed all Madagascar province corridors, bus stations and authentic parcels
    try:
        from backend.app.infrastructure.database.seed_provinces_and_test_parcels import (
            seed_provinces_and_test_parcels,
        )
        seed_provinces_and_test_parcels()
    except Exception as e:
        print(f"Notice during province seeder execution: {e}")


if __name__ == "__main__":
    seed_master_data()
