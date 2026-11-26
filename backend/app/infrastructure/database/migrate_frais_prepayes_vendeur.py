"""Migration Priorité 6 : ajout du champ frais_prepayes_vendeur sur les colis.

Lorsque les frais de livraison ont été payés d'avance au vendeur/expéditeur,
le livreur n'encaisse que la marchandise auprès du client, et les frais sont
déduits automatiquement lors du reversement au vendeur.

Usage : set PYTHONPATH=. && python -m backend.app.infrastructure.database.migrate_frais_prepayes_vendeur
"""

from sqlalchemy import text

from backend.app.infrastructure.database.connection import engine


def run_migration():
    with engine.connect() as conn:
        conn.execute(
            text("ALTER TABLE colis ADD COLUMN IF NOT EXISTS frais_prepayes_vendeur BOOLEAN DEFAULT FALSE NOT NULL;")
        )
        conn.commit()
    print("Migration réussie : colonne frais_prepayes_vendeur ajoutée à colis.")


if __name__ == "__main__":
    run_migration()
