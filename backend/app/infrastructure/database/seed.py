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
            conn.execute(text("ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS assigned_flux VARCHAR(30);"))
            conn.execute(text("ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check;"))
            conn.execute(text("""
                ALTER TABLE utilisateurs ADD CONSTRAINT utilisateurs_role_check 
                CHECK (role IN ('RECEPTIONNISTE', 'SUPERVISEUR', 'SUPER_ADMIN', 'LIVREUR'));
            """))
            conn.execute(text("ALTER TABLE colis ADD COLUMN IF NOT EXISTS receptionniste_id INTEGER REFERENCES utilisateurs(id);"))
            conn.execute(text("ALTER TABLE colis ADD COLUMN IF NOT EXISTS receptionniste_nom VARCHAR(100);"))
            # Priorité 7 : dépenses d'exploitation séparées des litiges
            conn.execute(text("ALTER TABLE tournees ADD COLUMN IF NOT EXISTS total_depenses DOUBLE PRECISION DEFAULT 0 NOT NULL;"))
            conn.execute(text("ALTER TABLE tournees ADD COLUMN IF NOT EXISTS motif_depenses VARCHAR(255);"))
            # Priorité 6 : frais de livraison prépayés au vendeur
            conn.execute(text("ALTER TABLE colis ADD COLUMN IF NOT EXISTS frais_prepayes_vendeur BOOLEAN DEFAULT FALSE NOT NULL;"))
            # Détails versement au quai (espèces, moyen mobile, référence)
            conn.execute(text("ALTER TABLE tournees ADD COLUMN IF NOT EXISTS montant_especes_remis DOUBLE PRECISION DEFAULT 0 NOT NULL;"))
            conn.execute(text("ALTER TABLE tournees ADD COLUMN IF NOT EXISTS montant_mobile_remis DOUBLE PRECISION DEFAULT 0 NOT NULL;"))
            conn.execute(text("ALTER TABLE tournees ADD COLUMN IF NOT EXISTS moyen_mobile VARCHAR(40);"))
            conn.execute(text("ALTER TABLE tournees ADD COLUMN IF NOT EXISTS reference_mobile VARCHAR(120);"))
            conn.commit()
    except Exception as e:
        print(f"Notice during constraint update: {e}")
    print("Tables created.")

    session = SessionLocal()
    try:
        # 1. Seed Exact Users: 1 Super Admin, 1 Directeur, 4 Agents
        exact_users = [
            UserORM(
                username="admin",
                email="admin@tmsexpress.mg",
                role="SUPER_ADMIN",
                nom_complet="Super Administrateur",
                mot_de_passe_hash=hash_password("admin123"),
                actif=1,
            ),
            UserORM(
                username="directeur",
                email="directeur@tmsexpress.mg",
                role="SUPER_ADMIN",
                nom_complet="Directeur des Opérations",
                mot_de_passe_hash=hash_password("directeur123"),
                actif=1,
            ),
            UserORM(
                username="agent1",
                email="agent1@tmsexpress.mg",
                role="RECEPTIONNISTE",
                nom_complet="Aina Razafy",
                mot_de_passe_hash=hash_password("agent123"),
                actif=1,
            ),
            UserORM(
                username="agent2",
                email="agent2@tmsexpress.mg",
                role="RECEPTIONNISTE",
                nom_complet="Faly Rabe",
                mot_de_passe_hash=hash_password("agent123"),
                actif=1,
            ),
            UserORM(
                username="agent3",
                email="agent3@tmsexpress.mg",
                role="RECEPTIONNISTE",
                nom_complet="Hery Andrianina",
                mot_de_passe_hash=hash_password("agent123"),
                actif=1,
            ),
            UserORM(
                username="agent4",
                email="agent4@tmsexpress.mg",
                role="RECEPTIONNISTE",
                nom_complet="Voahirana Rasoanaivo",
                mot_de_passe_hash=hash_password("agent123"),
                actif=1,
            ),
        ]
        for u in exact_users:
            existing = session.query(UserORM).filter(UserORM.username == u.username).first()
            if not existing:
                session.add(u)
            else:
                existing.nom_complet = u.nom_complet
                existing.role = u.role
                existing.email = u.email
                existing.mot_de_passe_hash = u.mot_de_passe_hash
                existing.actif = 1
        session.commit()
        print("6 Exact Users seeded (1 Super Admin, 1 Directeur, 4 Agents).")

        # 2. Seed the 9 Real Logistic Axes & Zones from Excel
        from backend.app.infrastructure.database.seed_real_urban_axes import apply_real_axes_migration
        apply_real_axes_migration()
        print("Real operational axes and zones seeded.")

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

        # 4. Seed initial Couriers (Mutualized pool: not assigned to axes directly, 30 parcels max)
        if not session.query(CourierORM).first():
            print("Seeding initial couriers...")
            couriers = [
                CourierORM(
                    nom="Rakoto Jean (Livreur 01)",
                    telephone="0341234567",
                    type_vehicule="Scooter 110cc",
                    caution_garantie=150000.0,
                    capacite_max_colis=30,
                    assigned_axis=None,
                    actif=1,
                ),
                CourierORM(
                    nom="Rabe Michel (Livreur 02)",
                    telephone="0321122334",
                    type_vehicule="Scooter 125cc",
                    caution_garantie=150000.0,
                    capacite_max_colis=30,
                    assigned_axis=None,
                    actif=1,
                ),
                CourierORM(
                    nom="Randria Paul (Livreur / Navette)",
                    telephone="0334455667",
                    type_vehicule="Fourgonnette Navette Transit",
                    caution_garantie=150000.0,
                    capacite_max_colis=30,
                    assigned_axis=None,
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


if __name__ == "__main__":
    seed_master_data()
