"""Migration Priorité 7 : ajout des dépenses d'exploitation sur les tournées.

Les dépenses (carburant, frais de route...) sont stockées sur la tournée et
NE SONT PLUS mélangées aux litiges livreurs.

Usage : set PYTHONPATH=. && python -m backend.app.infrastructure.database.migrate_tour_expenses
"""

from sqlalchemy import text

from backend.app.infrastructure.database.connection import engine


def run_migration():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE tournees ADD COLUMN IF NOT EXISTS total_depenses DOUBLE PRECISION DEFAULT 0 NOT NULL;"))
        conn.execute(text("ALTER TABLE tournees ADD COLUMN IF NOT EXISTS motif_depenses VARCHAR(255);"))
        conn.commit()
    print("Migration réussie : colonnes total_depenses / motif_depenses ajoutées à tournees.")


if __name__ == "__main__":
    run_migration()
