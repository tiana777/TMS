"""Script to completely remove all parcels, tours, couriers and related operational records.
Keeps master data intact: utilisateurs, vendeurs, partenaires, axes, zones.
Resets sequence counters so new records start from 1.
"""

from sqlalchemy import text
from backend.app.infrastructure.database.connection import SessionLocal

def clean_database():
    db = SessionLocal()
    try:
        print("Starting cleanup of all parcels and couriers...")

        # 1. Delete dependent child records
        r1 = db.execute(text("DELETE FROM remboursements_dettes;")).rowcount
        r2 = db.execute(text("DELETE FROM dettes_livreurs;")).rowcount
        r3 = db.execute(text("DELETE FROM encaissements;")).rowcount
        r4 = db.execute(text("DELETE FROM colis_statut_historique;")).rowcount
        r5 = db.execute(text("DELETE FROM evaluations_performance;")).rowcount

        # 2. Break references if any
        db.execute(text("UPDATE colis SET reversement_id = NULL, tournee_id = NULL, livreur_id = NULL;"))

        # 3. Delete parcels, tours, payouts, couriers
        r6 = db.execute(text("DELETE FROM colis;")).rowcount
        r7 = db.execute(text("DELETE FROM tournees;")).rowcount
        r8 = db.execute(text("DELETE FROM reversements_vendeurs;")).rowcount
        r9 = db.execute(text("DELETE FROM livreurs;")).rowcount

        # 4. Reset sequences for clean sequential numbering
        sequences = [
            "colis_id_seq",
            "livreurs_id_seq",
            "tournees_id_seq",
            "dettes_livreurs_id_seq",
            "remboursements_dettes_id_seq",
            "encaissements_id_seq",
            "colis_statut_historique_id_seq",
            "evaluations_performance_id_seq",
            "reversements_vendeurs_id_seq",
        ]
        for seq in sequences:
            try:
                db.execute(text(f"ALTER SEQUENCE IF EXISTS {seq} RESTART WITH 1;"))
            except Exception as e:
                print(f"Warning resetting sequence {seq}: {e}")

        db.commit()

        print("Cleanup completed successfully:")
        print(f" - Colis supprimés: {r6}")
        print(f" - Livreurs supprimés: {r9}")
        print(f" - Tournées supprimées: {r7}")
        print(f" - Reversements supprimés: {r8}")
        print(f" - Historiques statuts supprimés: {r4}")
        print(f" - Encaissements supprimés: {r3}")
        print(f" - Dettes supprimées: {r2}")
        print(f" - Remboursements supprimés: {r1}")
        print(f" - Évaluations supprimées: {r5}")
        print("Toutes les séquences d'identifiants ont été réinitialisées à 1.")

    except Exception as e:
        db.rollback()
        print(f"Erreur lors du nettoyage: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    clean_database()
