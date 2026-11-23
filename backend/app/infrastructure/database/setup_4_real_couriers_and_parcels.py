"""Script to completely purge the database and setup exactly 4 REAL couriers, accounts, and parcels for Pointage Terrain."""

from datetime import datetime, date, timedelta
from sqlalchemy import text
from backend.app.infrastructure.database.connection import SessionLocal
from backend.app.infrastructure.persistence.models import (
    CourierORM,
    UserORM,
    TourORM,
    ParcelORM,
    ParcelStatusHistoryORM,
    AxisORM,
    ZoneORM,
    PartnerORM,
    VendorORM,
)
from backend.app.infrastructure.security.auth import hash_password


def setup_clean_db_and_4_couriers():
    db = SessionLocal()
    try:
        print("=== 1. PURGE COMPLETE DE LA BASE (COLIS, TOURNEES, LIVREURS, FINANCES) ===")
        # Supprimer dans l'ordre strict des contraintes de clés étrangères
        db.execute(text("DELETE FROM remboursements_dettes;"))
        db.execute(text("DELETE FROM dettes_livreurs;"))
        db.execute(text("DELETE FROM evaluations_performance;"))
        db.execute(text("DELETE FROM encaissements;"))
        db.execute(text("DELETE FROM colis_statut_historique;"))
        db.execute(text("UPDATE colis SET reversement_id = NULL;"))
        db.execute(text("DELETE FROM reversements_vendeurs;"))
        db.execute(text("DELETE FROM colis;"))
        db.execute(text("DELETE FROM tournees;"))
        db.execute(text("DELETE FROM livreurs;"))
        
        # Réinitialiser toutes les séquences à 1
        seq_names = [
            "colis_id_seq",
            "tournees_id_seq",
            "livreurs_id_seq",
            "colis_statut_historique_id_seq",
            "dettes_livreurs_id_seq",
            "remboursements_dettes_id_seq",
            "evaluations_performance_id_seq",
            "encaissements_id_seq",
            "reversements_vendeurs_id_seq",
        ]
        for seq in seq_names:
            try:
                db.execute(text(f"ALTER SEQUENCE IF EXISTS {seq} RESTART WITH 1;"))
            except Exception as e:
                print(f"Seq reset notice for {seq}: {e}")
        db.commit()

        # Mettre à jour la contrainte de rôle utilisateur pour accepter LIVREUR
        db.execute(text("ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check;"))
        db.execute(text("""
            ALTER TABLE utilisateurs ADD CONSTRAINT utilisateurs_role_check 
            CHECK (role IN ('RECEPTIONNISTE', 'SUPERVISEUR', 'SUPER_ADMIN', 'LIVREUR'));
        """))
        db.commit()
        print("Purge effectuee et contrainte de role mise a jour pour inclure LIVREUR.")

        print("\n=== 2. CREATION DES 4 VRAIS LIVREURS MALGACHES ===")
        real_couriers_data = [
            {
                "id": 1,
                "nom": "Rakoto Jean (Livreur 01 - Moto)",
                "telephone": "0341234567",
                "type_vehicule": "Scooter 110cc",
                "caution_garantie": 150000.0,
                "capacite_max_colis": 30,
                "assigned_axis": None,
                "actif": 1,
            },
            {
                "id": 2,
                "nom": "Rabe Michel (Livreur 02 - Moto)",
                "telephone": "0321122334",
                "type_vehicule": "Scooter 125cc",
                "caution_garantie": 150000.0,
                "capacite_max_colis": 30,
                "assigned_axis": None,
                "actif": 1,
            },
            {
                "id": 3,
                "nom": "Andry Nirina (Livreur 03 - Moto)",
                "telephone": "0334455667",
                "type_vehicule": "Moto Cross 150cc",
                "caution_garantie": 150000.0,
                "capacite_max_colis": 30,
                "assigned_axis": None,
                "actif": 1,
            },
            {
                "id": 4,
                "nom": "Randria Paul (Livreur 04 - Fourgonnette)",
                "telephone": "0348899001",
                "type_vehicule": "Fourgonnette Navette Transit",
                "caution_garantie": 150000.0,
                "capacite_max_colis": 30,
                "assigned_axis": None,
                "actif": 1,
            },
        ]

        for c_data in real_couriers_data:
            c = CourierORM(**c_data)
            db.add(c)
        db.commit()
        db.execute(text("SELECT setval('livreurs_id_seq', 4, true);"))
        db.commit()
        print("4 vrais livreurs crees avec IDs 1, 2, 3, 4.")

        print("\n=== 3. CREATION / MISE A JOUR DES COMPTES DE CONNEXION LIVREURS ===")
        courier_users_data = [
            {
                "username": "livreur1",
                "email": "rakoto.jean@tmsexpress.mg",
                "role": "LIVREUR",
                "nom_complet": "Rakoto Jean (Livreur 01)",
                "mot_de_passe_hash": hash_password("livreur123"),
                "actif": 1,
            },
            {
                "username": "livreur2",
                "email": "rabe.michel@tmsexpress.mg",
                "role": "LIVREUR",
                "nom_complet": "Rabe Michel (Livreur 02)",
                "mot_de_passe_hash": hash_password("livreur123"),
                "actif": 1,
            },
            {
                "username": "livreur3",
                "email": "andry.nirina@tmsexpress.mg",
                "role": "LIVREUR",
                "nom_complet": "Andry Nirina (Livreur 03)",
                "mot_de_passe_hash": hash_password("livreur123"),
                "actif": 1,
            },
            {
                "username": "livreur4",
                "email": "randria.paul@tmsexpress.mg",
                "role": "LIVREUR",
                "nom_complet": "Randria Paul (Livreur 04)",
                "mot_de_passe_hash": hash_password("livreur123"),
                "actif": 1,
            },
        ]

        for u_data in courier_users_data:
            existing = db.query(UserORM).filter(UserORM.username == u_data["username"]).first()
            if not existing:
                u = UserORM(**u_data)
                db.add(u)
            else:
                existing.nom_complet = u_data["nom_complet"]
                existing.email = u_data["email"]
                existing.role = u_data["role"]
                existing.mot_de_passe_hash = u_data["mot_de_passe_hash"]
                existing.actif = 1
        db.commit()
        print("Comptes de connexion livreurs configures (livreur1..livreur4 / livreur123).")

        print("\n=== 4. CREATION DES TOURNEES DU JOUR POUR LES 4 LIVREURS ===")
        today_str = date.today().strftime("%Y-%m-%d")

        tours_data = [
            {
                "id": 1,
                "date_tournee": today_str,
                "livreur_id": 1,
                "statut": "EN_COURS",
                "total_theorique_caisse": 175000.0,
                "total_reel_verse": 0.0,
                "ecart_constate": -175000.0,
            },
            {
                "id": 2,
                "date_tournee": today_str,
                "livreur_id": 2,
                "statut": "EN_COURS",
                "total_theorique_caisse": 153000.0,
                "total_reel_verse": 95000.0,
                "ecart_constate": -58000.0,
            },
            {
                "id": 3,
                "date_tournee": today_str,
                "livreur_id": 3,
                "statut": "ASSIGNE",
                "total_theorique_caisse": 425000.0,
                "total_reel_verse": 0.0,
                "ecart_constate": -425000.0,
            },
            {
                "id": 4,
                "date_tournee": today_str,
                "livreur_id": 4,
                "statut": "EN_COURS",
                "total_theorique_caisse": 750000.0,
                "total_reel_verse": 190000.0,
                "ecart_constate": -560000.0,
            },
        ]

        for t_info in tours_data:
            t = TourORM(**t_info)
            db.add(t)
        db.commit()
        db.execute(text("SELECT setval('tournees_id_seq', 4, true);"))
        db.commit()
        print(f"4 tournees creees pour la date {today_str} (Tournee #1 a #4).")

        print("\n=== 5. CREATION DES COLIS REALISTES ASSIGNES AUX 4 LIVREURS ===")
        v1 = db.query(VendorORM).first()
        v_id = v1.id if v1 else 1

        parcels_seed = [
            # --- LIVREUR 01 : Rakoto Jean (Tournée 1 - Scooter 110cc) ---
            {
                "id": 1,
                "numero_bordereau": "BDR-COD-1001",
                "vendeur_id": v_id,
                "date_reception": today_str,
                "client_nom": "Rasoanirina Bakoly",
                "client_tel": "0341122334",
                "lieu_detail": "Antaninarenina, face Carlton",
                "designation": "Sandales Cuir & Sac à main",
                "axe": "AXE_CENTRE_1",
                "type_flux": "COD",
                "montant_marchandise": 65000.0,
                "frais_livraison": 3000.0,
                "frais_partenaire": 0.0,
                "statut": "EN_COURS",
                "tournee_id": 1,
                "livreur_id": 1,
                "receptionniste_id": 4,
                "receptionniste_nom": "Aina Razafy",
                "actif": 1,
                "observation": "Livraison matinale en bureau demandée",
            },
            {
                "id": 2,
                "numero_bordereau": "BDR-COD-1002",
                "vendeur_id": v_id,
                "date_reception": today_str,
                "client_nom": "Rakotomalala Tahina",
                "client_tel": "0324455667",
                "lieu_detail": "Ankorondrano, près Jumbo Score",
                "designation": "Chaussures Sportives 42",
                "axe": "AXE_NORD_EST",
                "type_flux": "COD",
                "montant_marchandise": 110000.0,
                "frais_livraison": 3000.0,
                "frais_partenaire": 0.0,
                "statut": "ASSIGNE",
                "tournee_id": 1,
                "livreur_id": 1,
                "receptionniste_id": 4,
                "receptionniste_nom": "Aina Razafy",
                "actif": 1,
                "observation": "Appeler 15 min avant arrivée",
            },
            {
                "id": 3,
                "numero_bordereau": "BDR-SMP-1003",
                "vendeur_id": v_id,
                "date_reception": today_str,
                "client_nom": "Dr. Ramaroson Luc",
                "client_tel": "0331298765",
                "lieu_detail": "Analakely Pavillon Box 12",
                "designation": "Dossier Médical & Analyses",
                "axe": "AXE_CENTRE_1",
                "type_flux": "SIMPLE",
                "montant_marchandise": 0.0,
                "frais_livraison": 3000.0,
                "frais_partenaire": 0.0,
                "statut": "ASSIGNE",
                "tournee_id": 1,
                "livreur_id": 1,
                "receptionniste_id": 5,
                "receptionniste_nom": "Faly Rabe",
                "actif": 1,
                "observation": "Port payé au dépôt",
            },

            # --- LIVREUR 02 : Rabe Michel (Tournée 2 - Scooter 125cc) ---
            {
                "id": 4,
                "numero_bordereau": "BDR-COD-2001",
                "vendeur_id": v_id,
                "date_reception": today_str,
                "client_nom": "Raveloarisoa Miora",
                "client_tel": "0347788990",
                "lieu_detail": "Tanjombato, près Smart",
                "designation": "Robe Soirée Dentelle",
                "axe": "AXE_SUD",
                "type_flux": "COD",
                "montant_marchandise": 95000.0,
                "frais_livraison": 3000.0,
                "frais_partenaire": 0.0,
                "statut": "LIVRE_ENCAISSE",
                "mode_paiement": "ESPECES",
                "tournee_id": 2,
                "livreur_id": 2,
                "receptionniste_id": 4,
                "receptionniste_nom": "Aina Razafy",
                "actif": 1,
                "observation": "Livré et encaissé en espèces",
            },
            {
                "id": 5,
                "numero_bordereau": "BDR-COD-2002",
                "vendeur_id": v_id,
                "date_reception": today_str,
                "client_nom": "Razanadrasoa Fanja",
                "client_tel": "0328899112",
                "lieu_detail": "Ankadimbahoaka, rond-point",
                "designation": "Pack Beauté Crèmes Bio",
                "axe": "AXE_SUD",
                "type_flux": "COD",
                "montant_marchandise": 55000.0,
                "frais_livraison": 3000.0,
                "frais_partenaire": 0.0,
                "statut": "EN_COURS",
                "tournee_id": 2,
                "livreur_id": 2,
                "receptionniste_id": 4,
                "receptionniste_nom": "Aina Razafy",
                "actif": 1,
                "observation": "Client prévenu par SMS",
            },
            {
                "id": 6,
                "numero_bordereau": "BDR-SMP-2003",
                "vendeur_id": v_id,
                "date_reception": today_str,
                "client_nom": "Cabinet Me Andry",
                "client_tel": "0332233445",
                "lieu_detail": "Andohalo, Haute Ville",
                "designation": "Contrat de Prestation Signé",
                "axe": "AXE_CENTRE_2",
                "type_flux": "SIMPLE",
                "montant_marchandise": 0.0,
                "frais_livraison": 3000.0,
                "frais_partenaire": 0.0,
                "statut": "LIVRE",
                "tournee_id": 2,
                "livreur_id": 2,
                "receptionniste_id": 5,
                "receptionniste_nom": "Faly Rabe",
                "actif": 1,
                "observation": "Remis au secrétariat",
            },

            # --- LIVREUR 03 : Andry Nirina (Tournée 3 - Moto Cross 150cc) ---
            {
                "id": 7,
                "numero_bordereau": "BDR-COD-3001",
                "vendeur_id": v_id,
                "date_reception": today_str,
                "client_nom": "Randriamihaja Hery",
                "client_tel": "0349911223",
                "lieu_detail": "Ivato Aéroport, zone fret",
                "designation": "Casque Bluetooth & Montre",
                "axe": "AXE_NORD_OUEST",
                "type_flux": "COD",
                "montant_marchandise": 140000.0,
                "frais_livraison": 5000.0,
                "frais_partenaire": 0.0,
                "statut": "ASSIGNE",
                "tournee_id": 3,
                "livreur_id": 3,
                "receptionniste_id": 4,
                "receptionniste_nom": "Aina Razafy",
                "actif": 1,
                "observation": "Tournée prête à démarrer",
            },
            {
                "id": 8,
                "numero_bordereau": "BDR-RET-3002",
                "vendeur_id": v_id,
                "date_reception": today_str,
                "client_nom": "Andrianina Marc",
                "client_tel": "0325566778",
                "lieu_detail": "Talatamaty, près Total",
                "designation": "Retour Échange Taille Chemise",
                "axe": "AXE_NORD_OUEST",
                "type_flux": "RETOUR",
                "montant_marchandise": 0.0,
                "frais_livraison": 3000.0,
                "frais_partenaire": 0.0,
                "statut": "ASSIGNE",
                "tournee_id": 3,
                "livreur_id": 3,
                "receptionniste_id": 7,
                "receptionniste_nom": "Voahirana Rasoanaivo",
                "actif": 1,
                "observation": "Retour SAV boutique",
            },
            {
                "id": 9,
                "numero_bordereau": "BDR-ENT-3003",
                "vendeur_id": v_id,
                "date_reception": today_str,
                "client_nom": "Société Madacom Galaxy",
                "client_tel": "0338877665",
                "lieu_detail": "Zone Galaxy Andraharo Bât B",
                "designation": "Cartons Fournitures Bureau",
                "axe": "AXE_OUEST_1",
                "type_flux": "COD",
                "montant_marchandise": 275000.0,
                "frais_livraison": 5000.0,
                "frais_partenaire": 0.0,
                "statut": "ASSIGNE",
                "tournee_id": 3,
                "livreur_id": 3,
                "receptionniste_id": 8,
                "receptionniste_nom": "Mamy Rakotomalala",
                "actif": 1,
                "observation": "Livraison entreprise B2B",
            },

            # --- LIVREUR 04 : Randria Paul (Tournée 4 - Fourgonnette Transit) ---
            {
                "id": 10,
                "numero_bordereau": "BDR-PRV-4001",
                "vendeur_id": v_id,
                "date_reception": today_str,
                "client_nom": "Coopérative Cotisse vers Majunga",
                "client_tel": "0341200011",
                "lieu_detail": "Gare Routière Ambodivona Guichet 3",
                "designation": "Colis Pièces Détachées Auto",
                "axe": "AXE_PROVINCE",
                "type_flux": "PROVINCE",
                "montant_marchandise": 210000.0,
                "frais_livraison": 10000.0,
                "frais_partenaire": 10000.0,
                "statut": "ASSIGNE",
                "tournee_id": 4,
                "livreur_id": 4,
                "receptionniste_id": 6,
                "receptionniste_nom": "Hery Andrianina",
                "actif": 1,
                "observation": "Transit départ 14h",
            },
            {
                "id": 11,
                "numero_bordereau": "BDR-PRV-4002",
                "vendeur_id": v_id,
                "date_reception": today_str,
                "client_nom": "Coopérative Kofmad vers Antsirabe",
                "client_tel": "0323344556",
                "lieu_detail": "Gare Fasan'ny Karana Quai 2",
                "designation": "Colis Friperie Ballots 50kg",
                "axe": "AXE_PROVINCE",
                "type_flux": "PROVINCE",
                "montant_marchandise": 340000.0,
                "frais_livraison": 10000.0,
                "frais_partenaire": 10000.0,
                "statut": "SOUS_TRAITE",
                "tournee_id": 4,
                "livreur_id": 4,
                "nom_partenaire": "Kofmad Transport",
                "reference_partenaire": "BL-KOF-882",
                "driver_contact": "0349988776",
                "vehicle_plate": "4512 TAB",
                "receptionniste_id": 6,
                "receptionniste_nom": "Hery Andrianina",
                "actif": 1,
                "observation": "Déposé en gare, contact chauffeur enregistré",
            },
            {
                "id": 12,
                "numero_bordereau": "BDR-PRV-4003",
                "vendeur_id": v_id,
                "date_reception": today_str,
                "client_nom": "Gare Trans Texpress vers Tamatave",
                "client_tel": "0336655443",
                "lieu_detail": "Ambodivona Quai 4",
                "designation": "Lots Électroménagers",
                "axe": "AXE_PROVINCE",
                "type_flux": "PROVINCE",
                "montant_marchandise": 170000.0,
                "frais_livraison": 10000.0,
                "frais_partenaire": 10000.0,
                "statut": "LIVRE_ENCAISSE",
                "mode_paiement": "MVOLA",
                "tournee_id": 4,
                "livreur_id": 4,
                "nom_partenaire": "Trans Texpress",
                "reference_partenaire": "TTX-2026-99",
                "driver_contact": "0347711223",
                "vehicle_plate": "7821 TBA",
                "receptionniste_id": 6,
                "receptionniste_nom": "Hery Andrianina",
                "actif": 1,
                "observation": "Encaissé par MVola au dépôt gare",
            },

            # --- COLIS EN ATTENTE DE DISPATCH AU QUAI (EN_DEPOT) ---
            {
                "id": 13,
                "numero_bordereau": "BDR-DEP-5001",
                "vendeur_id": v_id,
                "date_reception": today_str,
                "client_nom": "Ratsimba Patrick",
                "client_tel": "0345511223",
                "lieu_detail": "Isoraka, près Ambassade",
                "designation": "Montre Connectée Sport",
                "axe": "AXE_CENTRE_1",
                "type_flux": "COD",
                "montant_marchandise": 72000.0,
                "frais_livraison": 3000.0,
                "frais_partenaire": 0.0,
                "statut": "EN_DEPOT",
                "tournee_id": None,
                "livreur_id": None,
                "receptionniste_id": 4,
                "receptionniste_nom": "Aina Razafy",
                "actif": 1,
                "observation": "Prêt pour dispatch",
            },
            {
                "id": 14,
                "numero_bordereau": "BDR-DEP-5002",
                "vendeur_id": v_id,
                "date_reception": today_str,
                "client_nom": "Ravaka Lalaina",
                "client_tel": "0321199887",
                "lieu_detail": "Anosivavaka, bord route",
                "designation": "Paire Lunettes Soleil",
                "axe": "AXE_OUEST_1",
                "type_flux": "COD",
                "montant_marchandise": 37000.0,
                "frais_livraison": 3000.0,
                "frais_partenaire": 0.0,
                "statut": "EN_DEPOT",
                "tournee_id": None,
                "livreur_id": None,
                "receptionniste_id": 4,
                "receptionniste_nom": "Aina Razafy",
                "actif": 1,
                "observation": "Prêt pour dispatch",
            },
            {
                "id": 15,
                "numero_bordereau": "BDR-DEP-5003",
                "vendeur_id": v_id,
                "date_reception": today_str,
                "client_nom": "Notaire Rasoanaivo",
                "client_tel": "0334411223",
                "lieu_detail": "Ambatonakanga, montée",
                "designation": "Actes Notariés Authentiques",
                "axe": "AXE_CENTRE_1",
                "type_flux": "SIMPLE",
                "montant_marchandise": 0.0,
                "frais_livraison": 3000.0,
                "frais_partenaire": 0.0,
                "statut": "EN_DEPOT",
                "tournee_id": None,
                "livreur_id": None,
                "receptionniste_id": 5,
                "receptionniste_nom": "Faly Rabe",
                "actif": 1,
                "observation": "Plis express sous enveloppe",
            },
        ]

        for p_info in parcels_seed:
            p = ParcelORM(**p_info)
            db.add(p)
        db.commit()
        db.execute(text("SELECT setval('colis_id_seq', 15, true);"))
        db.commit()
        print("15 colis crees avec succes et dates d'aujourd'hui.")

        print("\n=== RECAPITULATIF FINAL DE LA BASE DE DONNEES ===")
        for c in db.query(CourierORM).order_by(CourierORM.id).all():
            c_parcels = db.query(ParcelORM).filter(ParcelORM.livreur_id == c.id).all()
            print(f"- [LIVREUR ID {c.id}] {c.nom} ({c.type_vehicule}) - Tel: {c.telephone}")
            print(f"    -> {len(c_parcels)} colis assignes dans la tournee #{c.id}")
            for cp in c_parcels:
                total_cod = (cp.montant_marchandise or 0) + (cp.frais_livraison or 0)
                print(f"       * {cp.numero_bordereau} | Statut: {cp.statut:14s} | {cp.client_nom:25s} | COD: {total_cod:,.0f} Ar")

        depot_parcels = db.query(ParcelORM).filter(ParcelORM.statut == "EN_DEPOT").all()
        print(f"\n- Colis au Quai (EN_DEPOT non assignes) : {len(depot_parcels)} colis")

    except Exception as e:
        db.rollback()
        print(f"Erreur durant l'initialisation : {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    setup_clean_db_and_4_couriers()
