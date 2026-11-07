"""Migration and seed update script for expediteur contacts."""

from backend.app.infrastructure.database.connection import engine, SessionLocal
from backend.app.infrastructure.persistence.models import VendorORM
from sqlalchemy import text


def update_data():
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE vendeurs ADD COLUMN IF NOT EXISTS type_expediteur VARCHAR(30) DEFAULT 'CYBERMARCHAND' NOT NULL;
            ALTER TABLE vendeurs ADD COLUMN IF NOT EXISTS adresse VARCHAR(255);
            ALTER TABLE vendeurs ADD COLUMN IF NOT EXISTS email VARCHAR(100);
            ALTER TABLE vendeurs ADD COLUMN IF NOT EXISTS nif_stat VARCHAR(50);
            ALTER TABLE colis ADD COLUMN IF NOT EXISTS expediteur_type VARCHAR(30) DEFAULT 'CYBERMARCHAND' NOT NULL;
            ALTER TABLE colis ADD COLUMN IF NOT EXISTS expediteur_nom VARCHAR(100);
            ALTER TABLE colis ADD COLUMN IF NOT EXISTS expediteur_tel VARCHAR(20);
            ALTER TABLE colis ADD COLUMN IF NOT EXISTS expediteur_adresse VARCHAR(255);
        """))
        conn.commit()

    session = SessionLocal()
    try:
        existing = {v.nom: v for v in session.query(VendorORM).all()}
        if "Mod'Tanà Boutique" in existing:
            v = existing["Mod'Tanà Boutique"]
            v.type_expediteur = "CYBERMARCHAND"
            v.adresse = "Box 14, Pavillon Analakely"
            v.email = "contact@modtana.mg"
            v.contact_responsable = "Madame Voahirana"

        if "Cabinet Juridique & Audit Tanà" not in existing:
            session.add(VendorORM(
                nom="Cabinet Juridique & Audit Tanà",
                type_expediteur="ENTREPRISE",
                telephone="0329988776",
                contact_responsable="Maître Andry Rabemananjara",
                adresse="Immeuble ARO, 3e étage, Antsakaviro",
                email="contact@audit-tana.mg",
                nif_stat="4001234567 / 2021",
                modalite_paiement="FACTURE_MENSUELLE",
                actif=1
            ))

        if "Rasoamalala Hanta (Envoi Personnel)" not in existing:
            session.add(VendorORM(
                nom="Rasoamalala Hanta (Envoi Personnel)",
                type_expediteur="PARTICULIER",
                telephone="0331234599",
                contact_responsable="Hanta Rasoamalala",
                adresse="Lot IVG 34 Ambohimanarina",
                email="hanta.rasoa@moov.mg",
                modalite_paiement="COMPTANT",
                actif=1
            ))

        session.commit()
        print("Expéditeurs database and seed updated successfully!")
    finally:
        session.close()


if __name__ == "__main__":
    update_data()
