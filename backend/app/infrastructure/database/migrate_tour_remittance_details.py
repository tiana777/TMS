"""Migration : ajout des détails de versement au quai (espèces, moyen mobile et référence) sur tournees.

Usage : set PYTHONPATH=. && python -m backend.app.infrastructure.database.migrate_tour_remittance_details
"""

from sqlalchemy import text

from backend.app.infrastructure.database.connection import engine


def run_migration():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE tournees ADD COLUMN IF NOT EXISTS montant_especes_remis DOUBLE PRECISION DEFAULT 0 NOT NULL;"))
        conn.execute(text("ALTER TABLE tournees ADD COLUMN IF NOT EXISTS montant_mobile_remis DOUBLE PRECISION DEFAULT 0 NOT NULL;"))
        conn.execute(text("ALTER TABLE tournees ADD COLUMN IF NOT EXISTS moyen_mobile VARCHAR(40);"))
        conn.execute(text("ALTER TABLE tournees ADD COLUMN IF NOT EXISTS reference_mobile VARCHAR(120);"))
        conn.commit()
    print("Migration réussie : colonnes de versement quai ajoutées à tournees.")


if __name__ == "__main__":
    run_migration()
