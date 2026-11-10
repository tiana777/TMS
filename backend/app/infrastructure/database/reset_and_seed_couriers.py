"""Script to clean database for testing:
- Removes all old couriers and related test records (tournées, dettes, évaluations, encaissements, reversements).
- Resets all parcels to 'EN_DEPOT' status without any courier or tour assigned.
- Resets sequence counters.
- Seeds 10 base couriers (1 for each of the 10 operational axes).
"""

from datetime import datetime
from sqlalchemy import text
from backend.app.infrastructure.database.connection import SessionLocal, engine
from backend.app.infrastructure.persistence.models import (
    CourierORM,
    TourORM,
    ParcelORM,
    ParcelStatusHistoryORM,
    CashCollectionORM,
    CourierDebtORM,
    DebtRepaymentORM,
    PerformanceEvaluationORM,
    VendorPayoutORM,
)

BASE_COURIERS = [
    {
        "nom": "Rakoto Jean",
        "telephone": "0341234501",
        "type_vehicule": "Scooter 110cc",
        "caution_garantie": 150000.0,
        "capacite_max_colis": 30,
        "assigned_axis": "AXE_CENTRE_1",
    },
    {
        "nom": "Rabe Michel",
        "telephone": "0321234502",
        "type_vehicule": "Moto 125cc",
        "caution_garantie": 150000.0,
        "capacite_max_colis": 30,
        "assigned_axis": "AXE_CENTRE_2",
    },
    {
        "nom": "Randria Paul",
        "telephone": "0331234503",
        "type_vehicule": "Moto 125cc",
        "caution_garantie": 150000.0,
        "capacite_max_colis": 30,
        "assigned_axis": "AXE_ITAOSY",
    },
    {
        "nom": "Razafindrakoto Hery",
        "telephone": "0341234504",
        "type_vehicule": "Scooter 110cc",
        "caution_garantie": 150000.0,
        "capacite_max_colis": 30,
        "assigned_axis": "AXE_AMPITATAFIKA",
    },
    {
        "nom": "Andriantsitohaina Tojo",
        "telephone": "0321234505",
        "type_vehicule": "Moto 150cc",
        "caution_garantie": 150000.0,
        "capacite_max_colis": 30,
        "assigned_axis": "AXE_AMBOHIMANGAKELY",
    },
    {
        "nom": "Rajaonarivelo Faly",
        "telephone": "0331234506",
        "type_vehicule": "Moto Trail 150cc",
        "caution_garantie": 150000.0,
        "capacite_max_colis": 30,
        "assigned_axis": "AXE_SABOTSY_NAMEHANA",
    },
    {
        "nom": "Ramanantsoa Eric",
        "telephone": "0341234507",
        "type_vehicule": "Moto 125cc",
        "caution_garantie": 150000.0,
        "capacite_max_colis": 30,
        "assigned_axis": "AXE_IVATO",
    },
    {
        "nom": "Rasolofo Nary",
        "telephone": "0321234508",
        "type_vehicule": "Moto Cross 150cc",
        "caution_garantie": 150000.0,
        "capacite_max_colis": 30,
        "assigned_axis": "AXE_IAVOLOHA",
    },
    {
        "nom": "Rakotomalala Luc",
        "telephone": "0331234509",
        "type_vehicule": "Moto 125cc",
        "caution_garantie": 150000.0,
        "capacite_max_colis": 30,
        "assigned_axis": "AXE_ALASORA",
    },
    {
        "nom": "Andrianarivo Patrick",
        "telephone": "0341234510",
        "type_vehicule": "Navette Fourgonnette",
        "caution_garantie": 300000.0,
        "capacite_max_colis": 30,
        "assigned_axis": None,
    },
]


def clean_and_seed():
    db = SessionLocal()
    try:
        print("=== 1. Nettoyage des tables dépendantes des livreurs et des tournées ===")
        # 1.1 Supprimer les remboursements de dettes
        deleted_remb = db.query(DebtRepaymentORM).delete()
        print(f"Remboursements de dettes supprimés : {deleted_remb}")

        # 1.2 Supprimer les dettes de livreurs
        deleted_dettes = db.query(CourierDebtORM).delete()
        print(f"Dettes livreurs supprimées : {deleted_dettes}")

        # 1.3 Supprimer les évaluations de performance
        deleted_evals = db.query(PerformanceEvaluationORM).delete()
        print(f"Évaluations de performance supprimées : {deleted_evals}")

        # 1.4 Supprimer les encaissements
        deleted_cash = db.query(CashCollectionORM).delete()
        print(f"Encaissements supprimés : {deleted_cash}")

        # 1.5 Supprimer l'historique de statut des colis
        deleted_hist = db.query(ParcelStatusHistoryORM).delete()
        print(f"Historique de statuts colis supprimé : {deleted_hist}")

        # 1.6 Réinitialiser les colis à l'état EN_DEPOT (sans livreur, sans tournée, sans reversement)
        updated_colis = db.query(ParcelORM).update({
            ParcelORM.livreur_id: None,
            ParcelORM.tournee_id: None,
            ParcelORM.statut: "EN_DEPOT",
            ParcelORM.reversement_id: None,
            ParcelORM.statut_reversement: "NON_REVERSE",
            ParcelORM.date_report: None,
            ParcelORM.motif_incident: None,
            ParcelORM.mode_paiement: None,
        })
        print(f"Colis réinitialisés en statut EN_DEPOT : {updated_colis}")

        # 1.7 Supprimer les reversements vendeurs
        deleted_rev = db.query(VendorPayoutORM).delete()
        print(f"Reversements vendeurs supprimés : {deleted_rev}")

        # 1.8 Supprimer toutes les tournées
        deleted_tournees = db.query(TourORM).delete()
        print(f"Tournées supprimées : {deleted_tournees}")

        # 1.9 Supprimer tous les livreurs existants
        deleted_livreurs = db.query(CourierORM).delete()
        print(f"Anciens livreurs supprimés : {deleted_livreurs}")

        db.commit()

        print("\n=== 2. Réinitialisation des séquences PostgreSQL ===")
        with engine.connect() as conn:
            conn.execute(text("ALTER SEQUENCE livreurs_id_seq RESTART WITH 1;"))
            conn.execute(text("ALTER SEQUENCE tournees_id_seq RESTART WITH 1;"))
            conn.execute(text("ALTER SEQUENCE dettes_livreurs_id_seq RESTART WITH 1;"))
            conn.execute(text("ALTER SEQUENCE evaluations_performance_id_seq RESTART WITH 1;"))
            conn.execute(text("ALTER SEQUENCE reversements_vendeurs_id_seq RESTART WITH 1;"))
            conn.execute(text("ALTER SEQUENCE encaissements_id_seq RESTART WITH 1;"))
            conn.execute(text("ALTER SEQUENCE colis_statut_historique_id_seq RESTART WITH 1;"))
            conn.commit()
        print("Séquences réinitialisées à 1.")

        print("\n=== 3. Création des 10 livreurs de base ===")
        new_couriers = []
        for c in BASE_COURIERS:
            courier = CourierORM(
                nom=c["nom"],
                telephone=c["telephone"],
                type_vehicule=c["type_vehicule"],
                caution_garantie=c["caution_garantie"],
                capacite_max_colis=c["capacite_max_colis"],
                assigned_axis=c["assigned_axis"],
                actif=1,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            new_couriers.append(courier)

        db.add_all(new_couriers)
        db.commit()

        print(f"Création réussie de {len(new_couriers)} livreurs.")
        for c in db.query(CourierORM).order_by(CourierORM.id).all():
            print(f"  [ID {c.id}] {c.nom} - Tél: {c.telephone} - Véhicule: {c.type_vehicule} - Axe: {c.assigned_axis} - Capacité: {c.capacite_max_colis}")

        print("\n=== 4. Vérification finale ===")
        total_couriers = db.query(CourierORM).count()
        total_parcels = db.query(ParcelORM).count()
        total_tours = db.query(TourORM).count()
        total_debts = db.query(CourierDebtORM).count()
        print(f"Total livreurs actifs : {total_couriers}")
        print(f"Total colis prêts au dépôt : {total_parcels}")
        print(f"Total tournées : {total_tours}")
        print(f"Total dettes : {total_debts}")

    except Exception as e:
        db.rollback()
        print(f"Erreur lors du nettoyage : {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    clean_and_seed()
