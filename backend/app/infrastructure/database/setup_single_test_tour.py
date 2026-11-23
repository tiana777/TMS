"""Script to set up EXACTLY ONE realistic delivery tour with 5 clean parcels for testing the COD & Siège workflow."""

from datetime import datetime, timezone
from sqlalchemy import text
from backend.app.infrastructure.database.connection import SessionLocal
from backend.app.infrastructure.persistence.models import (
    CourierORM,
    TourORM,
    ParcelORM,
    ParcelStatusHistoryORM,
    VendorORM,
)


def seed_single_tour_test():
    db = SessionLocal()
    try:
        print("=== 1. Nettoyage des anciennes données colis & tournées ===")
        db.execute(text("DELETE FROM remboursements_dettes;"))
        db.execute(text("DELETE FROM dettes_livreurs;"))
        db.execute(text("DELETE FROM evaluations_performance;"))
        db.execute(text("DELETE FROM encaissements;"))
        db.execute(text("DELETE FROM colis_statut_historique;"))
        db.execute(text("UPDATE colis SET reversement_id = NULL;"))
        db.execute(text("DELETE FROM reversements_vendeurs;"))
        db.execute(text("DELETE FROM colis;"))
        db.execute(text("DELETE FROM tournees;"))
        
        # Reset ID sequences
        for seq in ["colis_id_seq", "tournees_id_seq"]:
            try:
                db.execute(text(f"ALTER SEQUENCE IF EXISTS {seq} RESTART WITH 1;"))
            except Exception as e:
                print(f"Notice sequence reset {seq}: {e}")
        db.commit()

        print("=== 2. Vérification / Création du Livreur de Test ===")
        courier = db.query(CourierORM).filter(CourierORM.id == 1).first()
        if not courier:
            courier = CourierORM(
                id=1,
                nom="Rivo Navette & Urbain",
                telephone="0341234567",
                type_vehicule="Fourgonnette & Scooter",
                capacite_max_colis=30,
                assigned_axis="AXE_CENTRE_1",
                actif=1,
            )
            db.add(courier)
            db.commit()
            db.refresh(courier)
        else:
            courier.nom = "Rivo Navette & Urbain"
            courier.telephone = "0341234567"
            courier.type_vehicule = "Fourgonnette & Scooter"
            courier.capacite_max_colis = 30
            courier.actif = 1
            db.commit()

        # Récupérer ou créer un vendeur de test
        vendor = db.query(VendorORM).first()
        if not vendor:
            vendor = VendorORM(
                id=1,
                nom="Boutique Mode & Tech Tana",
                type_expediteur="CYBERMARCHAND",
                telephone="0340011223",
                adresse="Analakely, Antananarivo",
                actif=1,
            )
            db.add(vendor)
            db.commit()
            db.refresh(vendor)

        print("=== 3. Création de l'UNIQUE Tournée (Tour #1) ===")
        date_today = "2026-11-21"
        tour = TourORM(
            id=1,
            date_tournee=date_today,
            livreur_id=courier.id,
            statut="EN_COURS",
            total_theorique_caisse=131000,
            total_reel_verse=0,
            ecart_constate=0,
            created_at=datetime.now(timezone.utc),
        )
        db.add(tour)
        db.commit()
        db.refresh(tour)

        print("=== 4. Création des 8 Colis de Test couvrant TOUS les Scénarios ===")
        parcels_data = [
            # SCÉNARIO 1: Province - Sous-traité Gare avec COD perçu au Siège (EXCLU de la décharge livreur)
            {
                "id": 1,
                "numero_bordereau": "1001",
                "date_reception": date_today,
                "vendeur_id": vendor.id,
                "expediteur_nom": "Boutique Mode Tamatave",
                "client_nom": "Mme Voahirana Toamasina",
                "client_tel": "034 11 223 34",
                "lieu_detail": "Gare Ambodivona, Toamasina",
                "axe": "AXE_PROVINCE",
                "type_flux": "PROVINCE",
                "montant_marchandise": 50000,
                "frais_livraison": 5000,
                "statut": "SOUS_TRAITE",
                "nom_partenaire": "Cotisse Transport",
                "reference_partenaire": "COT-8899",
                "frais_partenaire": 15000,
                "mode_paiement": "MVOLA",
                "encaissement_lieu": "SIEGE",
                "tournee_id": tour.id,
                "livreur_id": courier.id,
                "observation": "COD 55 000 Ar réglé au Siège par MVola (Réf: MVO-4455). Le livreur navette ne doit rien encaisser.",
            },
            # SCÉNARIO 2: Province - Sous-traité Gare avec COD perçu en Espèces par le livreur navette
            {
                "id": 2,
                "numero_bordereau": "1002",
                "date_reception": date_today,
                "vendeur_id": vendor.id,
                "expediteur_nom": "Boutique Mode Majunga",
                "client_nom": "M. Andry Mahajanga",
                "client_tel": "032 99 887 76",
                "lieu_detail": "Gare Andohatapenaka, Mahajanga",
                "axe": "AXE_PROVINCE",
                "type_flux": "PROVINCE",
                "montant_marchandise": 40000,
                "frais_livraison": 5000,
                "statut": "SOUS_TRAITE",
                "nom_partenaire": "Besady Plus",
                "reference_partenaire": "BES-1122",
                "frais_partenaire": 12000,
                "mode_paiement": "ESPECES",
                "encaissement_lieu": "LIVREUR",
                "tournee_id": tour.id,
                "livreur_id": courier.id,
                "observation": "COD perçu en espèces par la navette gare lors de la remise à Besady.",
            },
            # SCÉNARIO 3: Urbain - Livré et Encaissé en Espèces par le livreur
            {
                "id": 3,
                "numero_bordereau": "1003",
                "date_reception": date_today,
                "vendeur_id": vendor.id,
                "expediteur_nom": "Boutique High-Tech Tana",
                "client_nom": "M. Hery Analakely",
                "client_tel": "033 44 556 67",
                "lieu_detail": "Pavillon 14, Analakely",
                "axe": "AXE_CENTRE_1",
                "type_flux": "COD",
                "montant_marchandise": 30000,
                "frais_livraison": 3000,
                "statut": "LIVRE_ENCAISSE",
                "mode_paiement": "ESPECES",
                "encaissement_lieu": "LIVREUR",
                "tournee_id": tour.id,
                "livreur_id": courier.id,
                "observation": "Livraison effectuée avec succès, espèces perçues au client.",
            },
            # SCÉNARIO 4: Urbain - Livré et Encaissé par Mobile Money AIRTEL
            {
                "id": 4,
                "numero_bordereau": "1004",
                "date_reception": date_today,
                "vendeur_id": vendor.id,
                "expediteur_nom": "Cosmétiques Bio Madagascar",
                "client_nom": "Mme Soa Ankorondrano",
                "client_tel": "034 88 990 01",
                "lieu_detail": "Immeuble Tana Water Front",
                "axe": "AXE_CENTRE_2",
                "type_flux": "COD",
                "montant_marchandise": 25000,
                "frais_livraison": 3000,
                "statut": "LIVRE_ENCAISSE",
                "mode_paiement": "AIRTEL",
                "encaissement_lieu": "LIVREUR",
                "tournee_id": tour.id,
                "livreur_id": courier.id,
                "observation": "Paiement client par Airtel Money reçu sur le téléphone du livreur.",
            },
            # SCÉNARIO 5: Urbain - Livré et Encaissé par Mobile Money ORANGE MONEY
            {
                "id": 5,
                "numero_bordereau": "1005",
                "date_reception": date_today,
                "vendeur_id": vendor.id,
                "expediteur_nom": "Librairie & Papeterie Antanimena",
                "client_nom": "M. Lova Antanimena",
                "client_tel": "032 44 332 21",
                "lieu_detail": "Face Villa Pradon, Antanimena",
                "axe": "AXE_CENTRE_2",
                "type_flux": "COD",
                "montant_marchandise": 22000,
                "frais_livraison": 3000,
                "statut": "LIVRE_ENCAISSE",
                "mode_paiement": "ORANGE_MONEY",
                "encaissement_lieu": "LIVREUR",
                "tournee_id": tour.id,
                "livreur_id": courier.id,
                "observation": "Paiement validé par Orange Money (Réf: OMG-9912).",
            },
            # SCÉNARIO 6: Urbain - Colis Prépayé (Marchandise 0 Ar, Frais livraison 3 000 Ar encaissés au Siège)
            {
                "id": 6,
                "numero_bordereau": "1006",
                "date_reception": date_today,
                "vendeur_id": vendor.id,
                "expediteur_nom": "Grossiste Vêtements Tsaralalana",
                "client_nom": "Société Aina Tsaralalana",
                "client_tel": "033 12 345 67",
                "lieu_detail": "Rue Pasteur, Tsaralalana",
                "axe": "AXE_CENTRE_1",
                "type_flux": "SIMPLE",
                "montant_marchandise": 0,
                "frais_livraison": 3000,
                "statut": "LIVRE",
                "mode_paiement": "VIREMENT",
                "encaissement_lieu": "SIEGE",
                "tournee_id": tour.id,
                "livreur_id": courier.id,
                "observation": "Colis prépayé intégralement par virement bancaire au Siège. 0 Ar à réclamer au destinataire.",
            },
            # SCÉNARIO 7: Urbain - Incident Reporté (Colis physique retourné au Hub, 0 Ar dû)
            {
                "id": 7,
                "numero_bordereau": "1007",
                "date_reception": date_today,
                "vendeur_id": vendor.id,
                "expediteur_nom": "Accessoires Auto Express",
                "client_nom": "M. Toky Tanjombato",
                "client_tel": "032 11 223 34",
                "lieu_detail": "Zone Zital, Tanjombato",
                "axe": "AXE_IAVOLOHA",
                "type_flux": "COD",
                "montant_marchandise": 20000,
                "frais_livraison": 3000,
                "statut": "REPORTE",
                "date_report": "2026-11-22",
                "motif_incident": "Client indisponible cet après-midi, reprogrammé à demain matin.",
                "encaissement_lieu": "LIVREUR",
                "tournee_id": tour.id,
                "livreur_id": courier.id,
                "observation": "Report convenu au téléphone.",
            },
            # SCÉNARIO 8: Urbain - Incident Annulé / Refusé (Colis physique retourné au Hub pour la boutique, 0 Ar dû)
            {
                "id": 8,
                "numero_bordereau": "1008",
                "date_reception": date_today,
                "vendeur_id": vendor.id,
                "expediteur_nom": "Boutique Chaussures Itaosy",
                "client_nom": "Mme Fara Cité Itaosy",
                "client_tel": "034 55 667 89",
                "lieu_detail": "Cité Seimad, Itaosy",
                "axe": "AXE_RN1",
                "type_flux": "COD",
                "montant_marchandise": 15000,
                "frais_livraison": 3000,
                "statut": "ANNULE_RETOUR",
                "motif_incident": "Client refuse la marchandise : pointure inadaptée. Retour demandé à la boutique.",
                "encaissement_lieu": "LIVREUR",
                "tournee_id": tour.id,
                "livreur_id": courier.id,
                "observation": "Refus client à la livraison. Colis scellé pour retour boutique.",
            },
        ]

        for p_data in parcels_data:
            parcel = ParcelORM(
                id=p_data["id"],
                numero_bordereau=p_data["numero_bordereau"],
                date_reception=p_data["date_reception"],
                vendeur_id=p_data["vendeur_id"],
                expediteur_type="CYBERMARCHAND",
                expediteur_nom=p_data["expediteur_nom"],
                client_nom=p_data["client_nom"],
                client_tel=p_data["client_tel"],
                lieu_detail=p_data["lieu_detail"],
                axe=p_data["axe"],
                type_flux=p_data["type_flux"],
                montant_marchandise=p_data["montant_marchandise"],
                frais_livraison=p_data["frais_livraison"],
                frais_partenaire=p_data.get("frais_partenaire", 0),
                statut=p_data["statut"],
                date_report=p_data.get("date_report"),
                motif_incident=p_data.get("motif_incident"),
                mode_paiement=p_data.get("mode_paiement"),
                nom_partenaire=p_data.get("nom_partenaire"),
                reference_partenaire=p_data.get("reference_partenaire"),
                encaissement_lieu=p_data["encaissement_lieu"],
                tournee_id=p_data["tournee_id"],
                livreur_id=p_data["livreur_id"],
                observation=p_data["observation"],
                actif=1,
                created_at=datetime.now(timezone.utc),
            )
            db.add(parcel)

            # Audit history
            hist = ParcelStatusHistoryORM(
                colis_id=p_data["id"],
                statut_precedent="EN_COURS",
                statut_nouveau=p_data["statut"],
                motif=p_data["observation"],
                horodatage=datetime.now(timezone.utc),
            )
            db.add(hist)

        db.commit()

        # Synchronize PostgreSQL sequences to avoid ID collision
        for seq, table in [
            ("colis_id_seq", "colis"),
            ("tournees_id_seq", "tournees"),
            ("livreurs_id_seq", "livreurs"),
            ("vendeurs_id_seq", "vendeurs"),
        ]:
            try:
                db.execute(text(f"SELECT setval('{seq}', (SELECT COALESCE(MAX(id), 1) FROM {table}));"))
            except Exception as e:
                print(f"Notice sequence sync {seq}: {e}")
        db.commit()

        print("=== SUCCÈS : 1 seule tournée (#1) avec 8 colis de test créée pour le 2026-11-21 ===")
        print(f"Tournée #{tour.id} - Livreur: {courier.nom}")
        print("  - Colis 1: BDR-1001 (55 000 Ar - PROVINCE - SOUS_TRAITE - COD au Siège MVOLA)")
        print("  - Colis 2: BDR-1002 (45 000 Ar - PROVINCE - SOUS_TRAITE - COD Livreur ESPECES)")
        print("  - Colis 3: BDR-1003 (33 000 Ar - URBAIN - LIVRE_ENCAISSE - ESPECES)")
        print("  - Colis 4: BDR-1004 (28 000 Ar - URBAIN - LIVRE_ENCAISSE - AIRTEL)")
        print("  - Colis 5: BDR-1005 (25 000 Ar - URBAIN - LIVRE_ENCAISSE - ORANGE MONEY)")
        print("  - Colis 6: BDR-1006 ( 3 000 Ar - URBAIN - LIVRE - PRÉPAYÉ au Siège VIREMENT)")
        print("  - Colis 7: BDR-1007 (23 000 Ar - URBAIN - REPORTE)")
        print("  - Colis 8: BDR-1008 (18 000 Ar - URBAIN - ANNULE_RETOUR / Refus client)")
        print("TOTAL BRUT LIVRE/SOUS-TRAITÉ: 189 000 Ar")
        print("ENCAISSÉ AU SIÈGE: -58 000 Ar (exclu du livreur : Colis 1 + Colis 6)")
        print("NET DÛ PAR LE LIVREUR AU QUAI: 131 000 Ar (78 000 Ar Espèces + 53 000 Ar Mobile)")

    except Exception as e:
        db.rollback()
        print(f"ERREUR lors de la création du jeu de données : {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_single_tour_test()
