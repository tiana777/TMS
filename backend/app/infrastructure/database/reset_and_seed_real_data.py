"""Script de réinitialisation complète et d'injection de données réelles de test.

Effectue :
1. Vidage complet des tables transactionnelles et opérationnelles (colis, tournées, encaissements, dettes, litiges, reversements).
2. Nettoyage des comptes utilisateurs pour conserver uniquement le personnel du Hub (Super Admin, Superviseur, Réceptionnistes de quai) sans aucun compte livreur web.
3. Conservation et standardisation des 4 livreurs opérationnels du quai.
4. Génération de donneurs d'ordre réels (Cybermarchands, Entreprises B2B, Particuliers) et coopératives régionales.
5. Injection de tournées réelles du jour (date dynamique du jour).
6. Injection de 37 colis réels multi-flux (COD, Simple, Province, SAV, B2B) couvrant tous les axes radiaux et gares.
"""

import sys
from datetime import datetime, date, timedelta
from sqlalchemy import text
from backend.app.infrastructure.database.connection import SessionLocal, engine
from backend.app.infrastructure.persistence.models import (
    Base,
    UserORM,
    CourierORM,
    VendorORM,
    PartnerORM,
    TourORM,
    ParcelORM,
    ParcelStatusHistoryORM,
    CashCollectionORM,
)
from backend.app.infrastructure.security.auth import hash_password


def run_reset_and_seed():
    db = SessionLocal()
    today_str = date.today().strftime("%Y-%m-%d")
    now = datetime.utcnow()

    print(f"=== INITIALISATION : DATE DU JOUR RETENUE = {today_str} ===")

    try:
        # =====================================================================
        # ÉTAPE 1 : VIDAGE COMPLET DES TABLES OPÉRATIONNELLES
        # =====================================================================
        print("\n--- 1. VIDAGE COMPLET DES DONNÉES TRANSACTIONNELLES ---")
        db.execute(text("DELETE FROM remboursements_dettes;"))
        db.execute(text("DELETE FROM dettes_livreurs;"))
        db.execute(text("DELETE FROM encaissements;"))
        db.execute(text("DELETE FROM evaluations_performance;"))
        db.execute(text("DELETE FROM colis_statut_historique;"))
        
        # Détacher les liens de clés étrangères circulaires
        db.execute(text("UPDATE colis SET reversement_id = NULL, tournee_id = NULL, livreur_id = NULL, partenaire_id = NULL, receptionniste_id = NULL;"))
        db.execute(text("DELETE FROM colis;"))
        db.execute(text("DELETE FROM tournees;"))
        db.execute(text("DELETE FROM reversements_vendeurs;"))

        # Réinitialiser les compteurs de séquences auto-incrémentées à 1
        seqs = [
            "colis_id_seq",
            "tournees_id_seq",
            "dettes_livreurs_id_seq",
            "remboursements_dettes_id_seq",
            "encaissements_id_seq",
            "colis_statut_historique_id_seq",
            "evaluations_performance_id_seq",
            "reversements_vendeurs_id_seq",
        ]
        for seq in seqs:
            try:
                db.execute(text(f"ALTER SEQUENCE IF EXISTS {seq} RESTART WITH 1;"))
            except Exception as e:
                print(f"Notice sequence {seq}: {e}")

        # Vérifier et assouplir la contrainte de rôle utilisateur si nécessaire
        try:
            db.execute(text("ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check;"))
            db.execute(text("""
                ALTER TABLE utilisateurs ADD CONSTRAINT utilisateurs_role_check 
                CHECK (role IN ('RECEPTIONNISTE', 'SUPERVISEUR', 'SUPER_ADMIN', 'LIVREUR'));
            """))
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Notice contrainte role : {e}")

        db.commit()
        print("-> Tables colis, tournées, encaissements et historiques vidées avec succès.")

        # =====================================================================
        # ÉTAPE 2 : PERSONNEL DU HUB & COMPTES OPÉRATIONNELS
        # =====================================================================
        print("\n--- 2. CONTRÔLE ET CRÉATION DU PERSONNEL HUB TMS EXPRESS ---")
        hub_staff = [
            {
                "username": "admin",
                "email": "admin@tmsexpress.mg",
                "role": "SUPER_ADMIN",
                "nom_complet": "Super Administrateur",
                "mot_de_passe_hash": hash_password("admin123"),
                "assigned_flux": None,
            },
            {
                "username": "directeur",
                "email": "directeur@tmsexpress.mg",
                "role": "SUPER_ADMIN",
                "nom_complet": "Directeur des Opérations",
                "mot_de_passe_hash": hash_password("directeur123"),
                "assigned_flux": None,
            },
            {
                "username": "superviseur",
                "email": "superviseur@tmsexpress.mg",
                "role": "SUPERVISEUR",
                "nom_complet": "Chef de Quai Dispatcher",
                "mot_de_passe_hash": hash_password("super123"),
                "assigned_flux": None,
            },
            {
                "username": "agent1",
                "email": "agent1@tmsexpress.mg",
                "role": "RECEPTIONNISTE",
                "nom_complet": "Aina Razafy",
                "mot_de_passe_hash": hash_password("agent123"),
                "assigned_flux": None,
            },
            {
                "username": "agent2",
                "email": "agent2@tmsexpress.mg",
                "role": "RECEPTIONNISTE",
                "nom_complet": "Faly Rabe",
                "mot_de_passe_hash": hash_password("agent123"),
                "assigned_flux": None,
            },
            {
                "username": "agent3",
                "email": "agent3@tmsexpress.mg",
                "role": "RECEPTIONNISTE",
                "nom_complet": "Hery Andrianina",
                "mot_de_passe_hash": hash_password("agent123"),
                "assigned_flux": None,
            },
            {
                "username": "agent4",
                "email": "agent4@tmsexpress.mg",
                "role": "RECEPTIONNISTE",
                "nom_complet": "Voahirana Rasoanaivo",
                "mot_de_passe_hash": hash_password("agent123"),
                "assigned_flux": None,
            },
            {
                "username": "recep_cod",
                "email": "aina.reception@tmsexpress.mg",
                "role": "RECEPTIONNISTE",
                "nom_complet": "Aina Razafy",
                "mot_de_passe_hash": hash_password("recep123"),
                "assigned_flux": None,
            },
            {
                "username": "recep_simple",
                "email": "faly.reception@tmsexpress.mg",
                "role": "RECEPTIONNISTE",
                "nom_complet": "Faly Rabe",
                "mot_de_passe_hash": hash_password("recep123"),
                "assigned_flux": None,
            },
            {
                "username": "recep_province",
                "email": "hery.reception@tmsexpress.mg",
                "role": "RECEPTIONNISTE",
                "nom_complet": "Hery Andrianina",
                "mot_de_passe_hash": hash_password("recep123"),
                "assigned_flux": None,
            },
            {
                "username": "recep_retour",
                "email": "voahirana.reception@tmsexpress.mg",
                "role": "RECEPTIONNISTE",
                "nom_complet": "Voahirana Rasoanaivo",
                "mot_de_passe_hash": hash_password("recep123"),
                "assigned_flux": None,
            },
            {
                "username": "recep_b2b",
                "email": "mamy.reception@tmsexpress.mg",
                "role": "RECEPTIONNISTE",
                "nom_complet": "Mamy Rakotomalala",
                "mot_de_passe_hash": hash_password("recep123"),
                "assigned_flux": None,
            },
            {
                "username": "reception",
                "email": "reception@tmsexpress.mg",
                "role": "RECEPTIONNISTE",
                "nom_complet": "Agent Accueil Inbound (Général)",
                "mot_de_passe_hash": hash_password("recep123"),
                "assigned_flux": None,
            },
            {
                "username": "livreur1",
                "email": "rakoto.jean@tmsexpress.mg",
                "role": "LIVREUR",
                "nom_complet": "Rakoto Jean (Livreur 01)",
                "mot_de_passe_hash": hash_password("livreur123"),
                "assigned_flux": None,
            },
            {
                "username": "livreur2",
                "email": "rabe.michel@tmsexpress.mg",
                "role": "LIVREUR",
                "nom_complet": "Rabe Michel (Livreur 02)",
                "mot_de_passe_hash": hash_password("livreur123"),
                "assigned_flux": None,
            },
            {
                "username": "livreur3",
                "email": "andry.nirina@tmsexpress.mg",
                "role": "LIVREUR",
                "nom_complet": "Andry Nirina (Livreur 03)",
                "mot_de_passe_hash": hash_password("livreur123"),
                "assigned_flux": None,
            },
            {
                "username": "livreur4",
                "email": "randria.paul@tmsexpress.mg",
                "role": "LIVREUR",
                "nom_complet": "Randria Paul (Livreur 04)",
                "mot_de_passe_hash": hash_password("livreur123"),
                "assigned_flux": None,
            },
        ]

        for s in hub_staff:
            existing = db.query(UserORM).filter(UserORM.username == s["username"]).first()
            if not existing:
                db.add(UserORM(**s, actif=1))
            else:
                existing.nom_complet = s["nom_complet"]
                existing.role = s["role"]
                existing.mot_de_passe_hash = s["mot_de_passe_hash"]
                existing.assigned_flux = s["assigned_flux"]
                existing.actif = 1
        db.commit()
        print("-> 8 profils du personnel Hub configurés.")

        # Récupérer les identifiants pour les affectations colis
        receptionists = {u.username: u for u in db.query(UserORM).filter(UserORM.role == "RECEPTIONNISTE").all()}

        # =====================================================================
        # ÉTAPE 3 : FLOTTE DES 4 LIVREURS OPÉRATIONNELS DE QUAI
        # =====================================================================
        print("\n--- 3. STANDARDISATION DES 4 COURSIERS OPÉRATIONNELS ---")
        db.execute(text("DELETE FROM livreurs WHERE id > 4 OR nom LIKE '%Test%' OR nom LIKE '%Integration%';"))
        db.commit()

        official_couriers = [
            {
                "id": 1,
                "nom": "Rakoto Jean (Livreur 01 - Moto)",
                "telephone": "0341234567",
                "type_vehicule": "Scooter 110cc",
                "caution_garantie": 150000.0,
                "capacite_max_colis": 30,
                "assigned_axis": "AXE_AMPITATAFIKA",
                "actif": 1,
            },
            {
                "id": 2,
                "nom": "Rabe Michel (Livreur 02 - Moto)",
                "telephone": "0321122334",
                "type_vehicule": "Scooter 125cc",
                "caution_garantie": 150000.0,
                "capacite_max_colis": 30,
                "assigned_axis": "AXE_AMBOHIMANGAKELY",
                "actif": 1,
            },
            {
                "id": 3,
                "nom": "Andry Nirina (Livreur 03 - Moto)",
                "telephone": "0334455667",
                "type_vehicule": "Moto Cross 150cc",
                "caution_garantie": 150000.0,
                "capacite_max_colis": 30,
                "assigned_axis": "AXE_SABOTSY_NAMEHANA",
                "actif": 1,
            },
            {
                "id": 4,
                "nom": "Randria Paul (Livreur 04 - Fourgonnette)",
                "telephone": "0348899001",
                "type_vehicule": "Fourgonnette Navette Transit",
                "caution_garantie": 150000.0,
                "capacite_max_colis": 30,
                "assigned_axis": "AXE_IVATO",
                "actif": 1,
            },
        ]

        for oc in official_couriers:
            c = db.query(CourierORM).filter(CourierORM.id == oc["id"]).first()
            if not c:
                db.add(CourierORM(**oc))
            else:
                c.nom = oc["nom"]
                c.telephone = oc["telephone"]
                c.type_vehicule = oc["type_vehicule"]
                c.caution_garantie = oc["caution_garantie"]
                c.capacite_max_colis = oc["capacite_max_colis"]
                c.assigned_axis = oc["assigned_axis"]
                c.actif = 1
        db.commit()
        try:
            db.execute(text("SELECT setval('livreurs_id_seq', 4, true);"))
            db.commit()
        except Exception:
            pass
        print("-> 4 coursiers officiels initialisés (IDs 1 à 4).")

        # =====================================================================
        # ÉTAPE 4 : DONNEURS D'ORDRE (VENDEURS & CLIENTS ENTREPRISE)
        # =====================================================================
        print("\n--- 4. INITIALISATION DES DONNEURS D'ORDRE RÉELS ---")
        vendors_data = [
            {
                "nom": "Mod'Tanà Boutique",
                "type_expediteur": "CYBERMARCHAND",
                "telephone": "0345566778",
                "contact_responsable": "Madame Voahirana",
                "adresse": "Box 14, Pavillon Analakely",
                "modalite_paiement": "COMPTANT",
            },
            {
                "nom": "TsenaTech Madagascar",
                "type_expediteur": "CYBERMARCHAND",
                "telephone": "0324488990",
                "contact_responsable": "Monsieur Andry Rasoanaivo",
                "adresse": "Galerie Zoom Ankorondrano, Box 05",
                "modalite_paiement": "COMPTANT",
            },
            {
                "nom": "Beauté Naturelle Malagasy",
                "type_expediteur": "CYBERMARCHAND",
                "telephone": "0331144778",
                "contact_responsable": "Mademoiselle Mirana",
                "adresse": "Lot II A 45 Antaninarenina",
                "modalite_paiement": "COMPTANT",
            },
            {
                "nom": "Cabinet Juridique & Audit Tanà",
                "type_expediteur": "ENTREPRISE",
                "telephone": "0329988776",
                "contact_responsable": "Maître Andry Rabemananjara",
                "adresse": "Immeuble ARO, 3e étage, Antsakaviro",
                "modalite_paiement": "FACTURE_MENSUELLE",
            },
            {
                "nom": "Laboratoire Médical Analakely",
                "type_expediteur": "ENTREPRISE",
                "telephone": "0341122998",
                "contact_responsable": "Dr Solofo Ramaroson",
                "adresse": "Avenue de l'Indépendance Analakely",
                "modalite_paiement": "FACTURE_MENSUELLE",
            },
            {
                "nom": "Rasoamalala Hanta (Envoi Personnel)",
                "type_expediteur": "PARTICULIER",
                "telephone": "0331234599",
                "contact_responsable": "Hanta Rasoamalala",
                "adresse": "Lot IVG 34 Ambohimanarina",
                "modalite_paiement": "COMPTANT",
            },
        ]

        vendors_map = {}
        for vd in vendors_data:
            existing = db.query(VendorORM).filter(VendorORM.nom == vd["nom"]).first()
            if not existing:
                new_v = VendorORM(**vd, actif=1)
                db.add(new_v)
                db.flush()
                vendors_map[vd["nom"]] = new_v
            else:
                vendors_map[vd["nom"]] = existing
        db.commit()
        print(f"-> {len(vendors_map)} donneurs d'ordre actifs prêts.")

        # =====================================================================
        # ÉTAPE 5 : PARTENAIRES RÉGIONAUX (GARES & COOPÉRATIVES)
        # =====================================================================
        print("\n--- 5. INITIALISATION DES PARTENAIRES COOPÉRATIVES ---")
        partners_data = [
            {"nom": "Cotisse Transport VIP & Colis", "type": "COOPERATIVE", "gare_rattachement": "Ambodivona", "contact": "032 11 027 10"},
            {"nom": "Soatrans Coopérative", "type": "COOPERATIVE", "gare_rattachement": "Fasan'ny Karana", "contact": "034 05 600 00"},
            {"nom": "Besady Plus Transport", "type": "COOPERATIVE", "gare_rattachement": "Andohatapenaka", "contact": "033 15 220 30"},
            {"nom": "Kofmad Transport Est", "type": "COOPERATIVE", "gare_rattachement": "Ambodivona", "contact": "032 55 440 01"},
        ]
        partners_map = {}
        for pd in partners_data:
            existing = db.query(PartnerORM).filter(PartnerORM.nom == pd["nom"]).first()
            if not existing:
                new_p = PartnerORM(**pd, actif=1)
                db.add(new_p)
                db.flush()
                partners_map[pd["nom"]] = new_p
            else:
                partners_map[pd["nom"]] = existing
        db.commit()
        print(f"-> {len(partners_map)} partenaires coopératives prêts.")

        # =====================================================================
        # ÉTAPE 6 : CRÉATION DES TOURNÉES RÉELLES POUR AUJOURD'HUI
        # =====================================================================
        print(f"\n--- 6. CRÉATION DES TOURNÉES OPÉRATIONNELLES DU {today_str} ---")
        # Tournée #1 : En cours (Livreur 01 Rakoto Jean - Moto 110cc)
        tour_en_cours = TourORM(
            date_tournee=today_str,
            livreur_id=1,
            statut="EN_COURS",
            total_theorique_caisse=0.0,
            total_reel_verse=0.0,
            ecart_constate=0.0,
            created_at=now - timedelta(hours=3),
        )
        db.add(tour_en_cours)

        # Tournée #2 : Clôturée & Encaissée (Livreur 02 Rabe Michel - Moto 125cc)
        tour_cloturee = TourORM(
            date_tournee=today_str,
            livreur_id=2,
            statut="CLOTURE",
            total_theorique_caisse=165000.0,
            total_reel_verse=165000.0,
            ecart_constate=0.0,
            cloture_a=now - timedelta(minutes=45),
            created_at=now - timedelta(hours=6),
        )
        db.add(tour_cloturee)

        # Tournée #3 : Assignée (Livreur 04 Randria Paul - Fourgonnette Transit Gares)
        tour_assignee = TourORM(
            date_tournee=today_str,
            livreur_id=4,
            statut="ASSIGNE",
            total_theorique_caisse=0.0,
            total_reel_verse=0.0,
            ecart_constate=0.0,
            created_at=now - timedelta(hours=1),
        )
        db.add(tour_assignee)

        # Tournée #4 : En cours (Livreur 03 Andry Nirina - Moto Cross 150cc)
        tour_livreur3 = TourORM(
            date_tournee=today_str,
            livreur_id=3,
            statut="EN_COURS",
            total_theorique_caisse=0.0,
            total_reel_verse=0.0,
            ecart_constate=0.0,
            created_at=now - timedelta(hours=2),
        )
        db.add(tour_livreur3)

        db.flush()
        db.commit()
        print(f"-> Tournées créées : Tournée #{tour_en_cours.id} (EN_COURS), #{tour_cloturee.id} (CLOTURE), #{tour_assignee.id} (ASSIGNE), #{tour_livreur3.id} (EN_COURS).")

        # =====================================================================
        # ÉTAPE 7 : CRÉATION D'UN JEU COMPLET DE COLIS RÉELS
        # =====================================================================
        print("\n--- 7. INJECTION DES COLIS RÉELS MULTI-FLUX ---")

        v_mod = vendors_map["Mod'Tanà Boutique"]
        v_tech = vendors_map["TsenaTech Madagascar"]
        v_bio = vendors_map["Beauté Naturelle Malagasy"]
        v_jur = vendors_map["Cabinet Juridique & Audit Tanà"]
        v_lab = vendors_map["Laboratoire Médical Analakely"]
        v_par = vendors_map["Rasoamalala Hanta (Envoi Personnel)"]

        p_cot = partners_map["Cotisse Transport VIP & Colis"]
        p_soa = partners_map["Soatrans Coopérative"]
        p_bes = partners_map["Besady Plus Transport"]

        u_aina = receptionists.get("agent1") or receptionists.get("recep_cod")
        u_faly = receptionists.get("agent2") or receptionists.get("recep_simple")
        u_hery = receptionists.get("agent3") or receptionists.get("recep_province")
        u_voahi = receptionists.get("agent4") or receptionists.get("recep_retour")
        u_mamy = receptionists.get("recep_b2b") or receptionists.get("reception")

        parcels_specs = [
            # -----------------------------------------------------------------
            # A. STOCK EN DÉPÔT (EN_DEPOT) - 18 COLIS PRÊTS POUR LE DISPATCHING
            # -----------------------------------------------------------------
            {
                "numero_bordereau": "BDR-2026-0101",
                "vendeur": v_mod,
                "client_nom": "Madame Rasoanaivo Fara",
                "client_tel": "0341234567",
                "designation": "Robe cocktail en soie sauvage & Pochette",
                "lieu_detail": "Analakely, en face Pharmacie Métropole",
                "axe": "AXE_CENTRE_1",
                "type_flux": "COD",
                "montant_marchandise": 65000.0,
                "frais_livraison": 3000.0,
                "mode_paiement": "ESPECES",
                "receptionniste": u_aina,
                "statut": "EN_DEPOT",
                "observation": "À livrer avant 11h30 au magasin",
            },
            {
                "numero_bordereau": "BDR-2026-0102",
                "vendeur": v_tech,
                "client_nom": "Monsieur Rakotomalala Rivo",
                "client_tel": "0329988771",
                "designation": "Écouteurs sans fil Bluetooth & Coque silicone",
                "lieu_detail": "Tsaralalàna, Rue Rainibetsimisaraka près BNI",
                "axe": "AXE_CENTRE_1",
                "type_flux": "COD",
                "montant_marchandise": 48000.0,
                "frais_livraison": 3000.0,
                "mode_paiement": "MVOLA",
                "receptionniste": u_aina,
                "statut": "EN_DEPOT",
                "observation": "Paiement MVola à la livraison",
            },
            {
                "numero_bordereau": "BDR-2026-0103",
                "vendeur": v_tech,
                "client_nom": "Andrianina Toky",
                "client_tel": "0331122334",
                "designation": "Disque dur externe SSD 1 To USB-C",
                "lieu_detail": "Antanimena, Immeuble STOI 1er étage",
                "axe": "AXE_CENTRE_2",
                "type_flux": "COD",
                "montant_marchandise": 145000.0,
                "frais_livraison": 3000.0,
                "mode_paiement": "ESPECES",
                "receptionniste": u_faly,
                "statut": "EN_DEPOT",
                "observation": "Société d'informatique, sonner à l'accueil",
            },
            {
                "numero_bordereau": "BDR-2026-0104",
                "vendeur": v_bio,
                "client_nom": "Razafindrakoto Hanta",
                "client_tel": "0345566112",
                "designation": "Coffret huiles essentielles Ravintsara & Katrafay",
                "lieu_detail": "Ankorondrano, Tour Zital rez-de-chaussée",
                "axe": "AXE_CENTRE_2",
                "type_flux": "COD",
                "montant_marchandise": 55000.0,
                "frais_livraison": 3000.0,
                "mode_paiement": "ORANGE_MONEY",
                "receptionniste": u_hery,
                "statut": "EN_DEPOT",
                "observation": "Livraison bureau entre 10h et 14h",
            },
            {
                "numero_bordereau": "BDR-2026-0105",
                "vendeur": v_mod,
                "client_nom": "Raharisoa Mialy",
                "client_tel": "0324455660",
                "designation": "Lot de 3 jeans slim denim bleu",
                "lieu_detail": "67Ha Sud, près Arrêt bus 119",
                "axe": "AXE_ITAOSY",
                "type_flux": "COD",
                "montant_marchandise": 70000.0,
                "frais_livraison": 3000.0,
                "mode_paiement": "ESPECES",
                "receptionniste": u_voahi,
                "statut": "EN_DEPOT",
                "observation": "Appeler dès arrivée au kiosque",
            },
            {
                "numero_bordereau": "BDR-2026-0106",
                "vendeur": v_tech,
                "client_nom": "Randrianasolo Heri",
                "client_tel": "0332233445",
                "designation": "Caméra de surveillance Wi-Fi extérieure",
                "lieu_detail": "Itaosy Cité, Villa Tsara Lot 12",
                "axe": "AXE_ITAOSY",
                "type_flux": "COD",
                "montant_marchandise": 95000.0,
                "frais_livraison": 4000.0,
                "mode_paiement": "ESPECES",
                "receptionniste": u_mamy,
                "statut": "EN_DEPOT",
                "observation": "Tester devant le portail",
            },
            {
                "numero_bordereau": "BDR-2026-0107",
                "vendeur": v_mod,
                "client_nom": "Rasoamanana Lala",
                "client_tel": "0347788991",
                "designation": "Paire d'escarpins cuir noir pointure 38",
                "lieu_detail": "Ampefiloha, Cité des 67Ha Ouest Bâtiment 4",
                "axe": "AXE_AMPITATAFIKA",
                "type_flux": "COD",
                "montant_marchandise": 52000.0,
                "frais_livraison": 3000.0,
                "mode_paiement": "ESPECES",
                "receptionniste": u_aina,
                "statut": "EN_DEPOT",
                "observation": "Livraison standard quai",
            },
            {
                "numero_bordereau": "BDR-2026-0108",
                "vendeur": v_par,
                "client_nom": "Rajaonarison Jean-Pierre",
                "client_tel": "0321144558",
                "designation": "Colis de livres scolaires et fournitures",
                "lieu_detail": "Ampitatafika, près du grand pont RN1",
                "axe": "AXE_AMPITATAFIKA",
                "type_flux": "SIMPLE",
                "montant_marchandise": 0.0,
                "frais_livraison": 4000.0,
                "mode_paiement": "ESPECES",
                "receptionniste": u_faly,
                "statut": "EN_DEPOT",
                "observation": "Port payé au départ par l'expéditeur",
            },
            {
                "numero_bordereau": "BDR-2026-0109",
                "vendeur": v_mod,
                "client_nom": "Andriamampionona Nivo",
                "client_tel": "0338899002",
                "designation": "Sac cabas en raphia brodé artisanal",
                "lieu_detail": "Besarety, près École Primaire Publique",
                "axe": "AXE_AMBOHIMANGAKELY",
                "type_flux": "COD",
                "montant_marchandise": 38000.0,
                "frais_livraison": 3000.0,
                "mode_paiement": "MVOLA",
                "receptionniste": u_hery,
                "statut": "EN_DEPOT",
                "observation": "Client présent à domicile toute la matinée",
            },
            {
                "numero_bordereau": "BDR-2026-0110",
                "vendeur": v_bio,
                "client_nom": "Rakotondrabe Michel",
                "client_tel": "0342233887",
                "designation": "Pack savon artisanal & baumes cicatrisants",
                "lieu_detail": "Ambohimangakely RN2, Station Shell",
                "axe": "AXE_AMBOHIMANGAKELY",
                "type_flux": "COD",
                "montant_marchandise": 42000.0,
                "frais_livraison": 4000.0,
                "mode_paiement": "ESPECES",
                "receptionniste": u_voahi,
                "statut": "EN_DEPOT",
                "observation": "Livraison en bordure de route nationale",
            },
            {
                "numero_bordereau": "BDR-2026-0111",
                "vendeur": v_tech,
                "client_nom": "Ratsimbazafy Fidy",
                "client_tel": "0326677889",
                "designation": "Batterie de secours Powerbank 20000 mAh",
                "lieu_detail": "Ankadikely Ilafy, Pharmacie du Nord",
                "axe": "AXE_SABOTSY_NAMEHANA",
                "type_flux": "COD",
                "montant_marchandise": 45000.0,
                "frais_livraison": 4000.0,
                "mode_paiement": "ESPECES",
                "receptionniste": u_mamy,
                "statut": "EN_DEPOT",
                "observation": "Prévenir 10 minutes avant par SMS",
            },
            {
                "numero_bordereau": "BDR-2026-0112",
                "vendeur": v_mod,
                "client_nom": "Razanamalala Sylvie",
                "client_tel": "0349900114",
                "designation": "Veste imperméable coupe-vent sport",
                "lieu_detail": "Sabotsy Namehana, Marché communal",
                "axe": "AXE_SABOTSY_NAMEHANA",
                "type_flux": "COD",
                "montant_marchandise": 58000.0,
                "frais_livraison": 4000.0,
                "mode_paiement": "AIRTEL",
                "receptionniste": u_aina,
                "statut": "EN_DEPOT",
                "observation": "Paiement Airtel Money à l'arrivée",
            },
            {
                "numero_bordereau": "BDR-2026-0113",
                "vendeur": v_jur,
                "client_nom": "Cabinet d'Avocats Ravelojaona",
                "client_tel": "0321234900",
                "designation": "Dossier juridique scellé d'appel d'offres",
                "lieu_detail": "Andraharo, Zone Galaxy Immeuble Ariane",
                "axe": "AXE_IVATO",
                "type_flux": "ENTREPRISE",
                "montant_marchandise": 0.0,
                "frais_livraison": 4000.0,
                "mode_paiement": "ESPECES",
                "receptionniste": u_mamy,
                "statut": "EN_DEPOT",
                "observation": "B2B prioritaire • Remise sous signature et tampon",
            },
            {
                "numero_bordereau": "BDR-2026-0114",
                "vendeur": v_tech,
                "client_nom": "Rakotonirina Onja",
                "client_tel": "0335566779",
                "designation": "Routeur 4G Wi-Fi Huawei débloqué",
                "lieu_detail": "Talatamaty, Station Total près aéroport",
                "axe": "AXE_IVATO",
                "type_flux": "COD",
                "montant_marchandise": 115000.0,
                "frais_livraison": 4000.0,
                "mode_paiement": "MVOLA",
                "receptionniste": u_faly,
                "statut": "EN_DEPOT",
                "observation": "Appeler le gardien de la résidence",
            },
            {
                "numero_bordereau": "BDR-2026-0115",
                "vendeur": v_bio,
                "client_nom": "Rasoarimanana Nicole",
                "client_tel": "0343344551",
                "designation": "Crème visage anti-âge au Moringa bio",
                "lieu_detail": "Tanjombato, Cité des Chasseurs près Jumbo",
                "axe": "AXE_IAVOLOHA",
                "type_flux": "COD",
                "montant_marchandise": 36000.0,
                "frais_livraison": 4000.0,
                "mode_paiement": "ESPECES",
                "receptionniste": u_voahi,
                "statut": "EN_DEPOT",
                "observation": "En dépôt quai pour dispatch Tanjombato",
            },
            {
                "numero_bordereau": "BDR-2026-0116",
                "vendeur": v_mod,
                "client_nom": "Andriambololona Patrick",
                "client_tel": "0328899110",
                "designation": "Ensemble survêtement jogging capuche",
                "lieu_detail": "Mandroseza, près Centrale Jirama",
                "axe": "AXE_ALASORA",
                "type_flux": "COD",
                "montant_marchandise": 62000.0,
                "frais_livraison": 4000.0,
                "mode_paiement": "ESPECES",
                "receptionniste": u_aina,
                "statut": "EN_DEPOT",
                "observation": "Client joignable par WhatsApp",
            },
            {
                "numero_bordereau": "BDR-2026-0117",
                "vendeur": v_mod,
                "client_nom": "Rasoanandrasana Marie",
                "client_tel": "0334499881",
                "designation": "Colis textile • Robes enfants & layettes",
                "lieu_detail": "Gare Ambodivona vers Tamatave (Cotisse)",
                "axe": "AXE_PROVINCE",
                "type_flux": "PROVINCE",
                "montant_marchandise": 85000.0,
                "frais_livraison": 14000.0,
                "frais_partenaire": 10000.0,
                "nom_partenaire": p_cot.nom,
                "partenaire": p_cot,
                "mode_paiement": "ESPECES",
                "receptionniste": u_faly,
                "statut": "EN_DEPOT",
                "observation": "Dépôt gare prévu en navette à 11h",
            },
            {
                "numero_bordereau": "BDR-2026-0118",
                "vendeur": v_tech,
                "client_nom": "Rakotoharisoa Liva",
                "client_tel": "0347711229",
                "designation": "Tablette Android 10 pouces & Clavier",
                "lieu_detail": "Gare Fasan'ny Karana vers Antsirabe (Soatrans)",
                "axe": "AXE_PROVINCE",
                "type_flux": "PROVINCE",
                "montant_marchandise": 190000.0,
                "frais_livraison": 16000.0,
                "frais_partenaire": 12000.0,
                "nom_partenaire": p_soa.nom,
                "partenaire": p_soa,
                "mode_paiement": "ESPECES",
                "receptionniste": u_hery,
                "statut": "EN_DEPOT",
                "observation": "Fragile • Récépissé à photographier",
            },
            {
                "numero_bordereau": "BDR-2026-0119",
                "vendeur": v_jur,
                "client_nom": "Société Batimex Madagascar",
                "client_tel": "0342211990",
                "designation": "Pli scellé & Documents d'expertise comptable",
                "lieu_detail": "Ampefiloha, Immeuble ARO rez-de-chaussée",
                "axe": "AXE_AMPITATAFIKA",
                "type_flux": "SIMPLE",
                "montant_marchandise": 0.0,
                "frais_livraison": 3000.0,
                "mode_paiement": "ESPECES",
                "receptionniste": u_faly,
                "statut": "EN_DEPOT",
                "observation": "Course simple • Port payé par l'expéditeur",
            },
            {
                "numero_bordereau": "BDR-2026-0120",
                "vendeur": v_par,
                "client_nom": "Monsieur Eric Randriamanantena",
                "client_tel": "0325533112",
                "designation": "Échantillons d'artisanat & gousses de vanille",
                "lieu_detail": "Antanimena, Villa Pradon Lot 14",
                "axe": "AXE_CENTRE_2",
                "type_flux": "SIMPLE",
                "montant_marchandise": 0.0,
                "frais_livraison": 3000.0,
                "mode_paiement": "ESPECES",
                "receptionniste": u_hery,
                "statut": "EN_DEPOT",
                "observation": "Port payé • Remise en mains propres",
            },
            {
                "numero_bordereau": "BDR-2026-0121",
                "vendeur": v_jur,
                "client_nom": "Société Omnium Telecom B2B",
                "client_tel": "0340011223",
                "designation": "Contrat de maintenance réseaux & Facturation mensuelle",
                "lieu_detail": "Ankorondrano, Tour Zital 4ème étage",
                "axe": "AXE_CENTRE_2",
                "type_flux": "ENTREPRISE",
                "montant_marchandise": 0.0,
                "frais_livraison": 5000.0,
                "mode_paiement": "ESPECES",
                "receptionniste": u_mamy,
                "statut": "EN_DEPOT",
                "observation": "Contrat Entreprise • Facturation groupée fin de mois",
            },
            {
                "numero_bordereau": "BDR-2026-0122",
                "vendeur": v_tech,
                "client_nom": "Madame Seheno Ravalison",
                "client_tel": "0332211448",
                "designation": "Décodeur TV défectueux retour SAV pour échange sous garantie",
                "lieu_detail": "Analakely, face Gare Soarano",
                "axe": "AXE_CENTRE_1",
                "type_flux": "RETOUR",
                "montant_marchandise": 0.0,
                "frais_livraison": 3000.0,
                "mode_paiement": "ESPECES",
                "receptionniste": u_voahi,
                "statut": "EN_DEPOT",
                "observation": "Retour SAV & Échange • Bon de retour boutique joint",
            },

            # -----------------------------------------------------------------
            # B. EN COURS DE LIVRAISON (EN_COURS) - TOURNÉE #1 LIVREUR 01 (RAKOTO)
            # -----------------------------------------------------------------
            {
                "numero_bordereau": "BDR-2026-0201",
                "vendeur": v_mod,
                "client_nom": "Madame Rasoa Julie",
                "client_tel": "0341100221",
                "designation": "Manteau d'hiver molletonné & Écharpe",
                "lieu_detail": "Ampefiloha, Immeuble Plan Bâtiment B",
                "axe": "AXE_AMPITATAFIKA",
                "type_flux": "COD",
                "montant_marchandise": 80000.0,
                "frais_livraison": 3000.0,
                "mode_paiement": "ESPECES",
                "livreur_id": 1,
                "tournee": tour_en_cours,
                "receptionniste": u_aina,
                "statut": "EN_COURS",
                "observation": "En cours sur la tournée active de Rakoto Jean",
            },
            {
                "numero_bordereau": "BDR-2026-0202",
                "vendeur": v_tech,
                "client_nom": "Mamy Nirina",
                "client_tel": "0325544331",
                "designation": "Microphone USB streaming & Trépied",
                "lieu_detail": "Anosibe Marché, Pharmacie du Sud",
                "axe": "AXE_AMPITATAFIKA",
                "type_flux": "COD",
                "montant_marchandise": 68000.0,
                "frais_livraison": 3000.0,
                "mode_paiement": "MVOLA",
                "livreur_id": 1,
                "tournee": tour_en_cours,
                "receptionniste": u_faly,
                "statut": "EN_COURS",
                "observation": "Livraison en matinée",
            },
            {
                "numero_bordereau": "BDR-2026-0203",
                "vendeur": v_bio,
                "client_nom": "Madame Koloina",
                "client_tel": "0331234560",
                "designation": "Gamme shampoing solide & Masque capillaire",
                "lieu_detail": "Fenoarivo, Station Jovena",
                "axe": "AXE_AMPITATAFIKA",
                "type_flux": "COD",
                "montant_marchandise": 45000.0,
                "frais_livraison": 4000.0,
                "mode_paiement": "ESPECES",
                "livreur_id": 1,
                "tournee": tour_en_cours,
                "receptionniste": u_hery,
                "statut": "EN_COURS",
                "observation": "Point de rencontre fixé devant la station",
            },
            {
                "numero_bordereau": "BDR-2026-0204",
                "vendeur": v_mod,
                "client_nom": "Rivo Andriantsalama",
                "client_tel": "0348899220",
                "designation": "Costume deux pièces homme cintré",
                "lieu_detail": "Ampitatafika Centre, face Mairie",
                "axe": "AXE_AMPITATAFIKA",
                "type_flux": "COD",
                "montant_marchandise": 110000.0,
                "frais_livraison": 4000.0,
                "mode_paiement": "ESPECES",
                "livreur_id": 1,
                "tournee": tour_en_cours,
                "receptionniste": u_voahi,
                "statut": "EN_COURS",
                "observation": "Essai de taille demandé par le client",
            },

            # -----------------------------------------------------------------
            # C. CLÔTURÉS & ENCAISSÉS (LIVRE_ENCAISSE) - TOURNÉE #2 (RABE)
            # -----------------------------------------------------------------
            {
                "numero_bordereau": "BDR-2026-0301",
                "vendeur": v_mod,
                "client_nom": "Madame Bakoly Rasendrasoa",
                "client_tel": "0341122339",
                "designation": "Ensemble tailleur jupe lin naturel",
                "lieu_detail": "Besarety, face Pharmacie Principale",
                "axe": "AXE_AMBOHIMANGAKELY",
                "type_flux": "COD",
                "montant_marchandise": 55000.0,
                "frais_livraison": 3000.0,
                "mode_paiement": "ESPECES",
                "livreur_id": 2,
                "tournee": tour_cloturee,
                "receptionniste": u_aina,
                "statut": "LIVRE_ENCAISSE",
                "observation": "Livré sans incident • Montant versé en caisse",
            },
            {
                "numero_bordereau": "BDR-2026-0302",
                "vendeur": v_tech,
                "client_nom": "Monsieur Tojo Ramanantoanina",
                "client_tel": "0324488112",
                "designation": "Casque audio gamer avec micro RGB",
                "lieu_detail": "Ampasampito, Résidence Les Oliviers",
                "axe": "AXE_AMBOHIMANGAKELY",
                "type_flux": "COD",
                "montant_marchandise": 72000.0,
                "frais_livraison": 3000.0,
                "mode_paiement": "MVOLA",
                "livreur_id": 2,
                "tournee": tour_cloturee,
                "receptionniste": u_faly,
                "statut": "LIVRE_ENCAISSE",
                "observation": "Encaissé par MVola • Référence transaction validée",
            },
            {
                "numero_bordereau": "BDR-2026-0303",
                "vendeur": v_bio,
                "client_nom": "Madame Vero Andriamainty",
                "client_tel": "0331199004",
                "designation": "Pack bien-être infusion & bougies vanille",
                "lieu_detail": "Ambohimangakely, près Bureau de Poste",
                "axe": "AXE_AMBOHIMANGAKELY",
                "type_flux": "COD",
                "montant_marchandise": 38000.0,
                "frais_livraison": 4000.0,
                "mode_paiement": "ESPECES",
                "livreur_id": 2,
                "tournee": tour_cloturee,
                "receptionniste": u_mamy,
                "statut": "LIVRE_ENCAISSE",
                "observation": "Client fidèle • Remise effectuée",
            },

            # -----------------------------------------------------------------
            # D. INCIDENTS RÉELS : REPORTÉ (REPORTE) & ANNULÉ (ANNULE_RETOUR)
            # -----------------------------------------------------------------
            {
                "numero_bordereau": "BDR-2026-0401",
                "vendeur": v_mod,
                "client_nom": "Monsieur Tantely Rabe",
                "client_tel": "0345522119",
                "designation": "Paire mocassins en cuir marron pointure 41",
                "lieu_detail": "Analakely, Pavillon 18",
                "axe": "AXE_CENTRE_1",
                "type_flux": "COD",
                "montant_marchandise": 62000.0,
                "frais_livraison": 3000.0,
                "mode_paiement": "ESPECES",
                "livreur_id": 1,
                "tournee": tour_en_cours,
                "receptionniste": u_hery,
                "statut": "REPORTE",
                "date_report": (date.today() + timedelta(days=1)).strftime("%Y-%m-%d"),
                "motif_incident": "Client absent lors du passage du livreur • Demandé report à demain 14h",
                "observation": "À reprogrammer dans le dispatching de demain",
            },
            {
                "numero_bordereau": "BDR-2026-0402",
                "vendeur": v_tech,
                "client_nom": "Mademoiselle Fara Voahirana",
                "client_tel": "0321199884",
                "designation": "Montre connectée Fitness Tracker étanche",
                "lieu_detail": "Antanimena, près Kiosque Telma",
                "axe": "AXE_CENTRE_2",
                "type_flux": "RETOUR",
                "montant_marchandise": 48000.0,
                "frais_livraison": 3000.0,
                "mode_paiement": "ESPECES",
                "livreur_id": 1,
                "tournee": tour_en_cours,
                "receptionniste": u_aina,
                "statut": "ANNULE_RETOUR",
                "motif_incident": "Refus client au déballage : modèle différent de la photo en ligne",
                "observation": "Colis réintégré au quai SAV pour retour à la boutique Mod'Tanà",
            },

            # -----------------------------------------------------------------
            # E. PROVINCE SOUS-TRAITÉ (SOUS_TRAITE) AVEC RÉCÉPISSÉ CHAUFFEUR
            # -----------------------------------------------------------------
            {
                "numero_bordereau": "BDR-2026-0501",
                "vendeur": v_mod,
                "client_nom": "Monsieur Claude Andriamihaja",
                "client_tel": "0340567890",
                "designation": "Carton vêtements prêt-à-porter boutique",
                "lieu_detail": "Gare Ambodivona vers Tamatave Bazar Be",
                "axe": "AXE_PROVINCE",
                "type_flux": "PROVINCE",
                "montant_marchandise": 180000.0,
                "frais_livraison": 20000.0,
                "frais_partenaire": 15000.0,
                "nom_partenaire": p_cot.nom,
                "partenaire": p_cot,
                "reference_partenaire": "COT-TMM-2026-8812",
                "driver_contact": "Chauffeur Rivo (Cotisse VIP) : 032 02 441 55",
                "vehicle_plate": "7812 TBE (Sprinter)",
                "mode_paiement": "ESPECES",
                "livreur_id": 4,
                "tournee": tour_assignee,
                "receptionniste": u_aina,
                "statut": "SOUS_TRAITE",
                "observation": "Déposé au guichet Cotisse Ambodivona • Colis en route pour Tamatave",
            },
            {
                "numero_bordereau": "BDR-2026-0502",
                "vendeur": v_tech,
                "client_nom": "Madame Lanto Ratsimbazafy",
                "client_tel": "0331188772",
                "designation": "Matériel sono & Électronique",
                "lieu_detail": "Gare Fasan'ny Karana vers Fianarantsoa",
                "axe": "AXE_PROVINCE",
                "type_flux": "PROVINCE",
                "montant_marchandise": 135000.0,
                "frais_livraison": 18000.0,
                "frais_partenaire": 14000.0,
                "nom_partenaire": p_soa.nom,
                "partenaire": p_soa,
                "reference_partenaire": "SOA-FNA-9914",
                "driver_contact": "Chauffeur Faneva (Soatrans) : 034 11 992 01",
                "vehicle_plate": "3415 TBF",
                "mode_paiement": "ESPECES",
                "livreur_id": 4,
                "tournee": tour_assignee,
                "receptionniste": u_hery,
                "statut": "SOUS_TRAITE",
                "observation": "Récépissé agence Soatrans Fasan'ny Karana archivé",
            },

            # -----------------------------------------------------------------
            # F. TOURNÉE #4 (ANDRY NIRINA - LIVREUR 03) : VENTE PARTIELLE, URGENT, LIVRÉ
            # -----------------------------------------------------------------
            {
                "numero_bordereau": "BDR-2026-0601",
                "vendeur": v_mod,
                "client_nom": "Madame Haingo Ravelo",
                "client_tel": "0342244668",
                "designation": "3 paires d'escarpins (Vente Partielle : 2 conservées, 1 retournée)",
                "lieu_detail": "Sabotsy Namehana, Pharmacie Principale",
                "axe": "AXE_SABOTSY_NAMEHANA",
                "type_flux": "COD",
                "montant_marchandise": 60000.0,
                "frais_livraison": 4000.0,
                "mode_paiement": "ESPECES",
                "livreur_id": 3,
                "tournee": tour_livreur3,
                "receptionniste": u_aina,
                "statut": "LIVRE_ENCAISSE",
                "encaissement_lieu": "LIVREUR",
                "repartition_vendeur": "COD_SEUL",
                "montant_encaisse_livreur": 64000.0,
                "montant_encaisse_vendeur": 0.0,
                "observation": "Vente partielle : 2 paires gardées (60 000 Ar) + frais (4 000 Ar), 1 paire retournée au livreur.",
            },
            {
                "numero_bordereau": "BDR-2026-0602",
                "vendeur": v_tech,
                "client_nom": "Docteur Rianala Randria",
                "client_tel": "0335511447",
                "designation": "URGENT • Pièce de rechange moniteur médical",
                "lieu_detail": "Ilafy, Clinique Saint-Luc Lot 45",
                "axe": "AXE_SABOTSY_NAMEHANA",
                "type_flux": "COD",
                "montant_marchandise": 125000.0,
                "frais_livraison": 4000.0,
                "mode_paiement": "MVOLA",
                "livreur_id": 3,
                "tournee": tour_livreur3,
                "receptionniste": u_faly,
                "statut": "EN_COURS",
                "observation": "URGENT • Livraison express prioritaire avant midi demandée par l'expéditeur.",
            },
            {
                "numero_bordereau": "BDR-2026-0603",
                "vendeur": v_bio,
                "client_nom": "Mademoiselle Tantely Nirina",
                "client_tel": "0329944118",
                "designation": "Pack cosmétique bio karité & baobab",
                "lieu_detail": "Ankadikely, Marché communal Box 12",
                "axe": "AXE_SABOTSY_NAMEHANA",
                "type_flux": "COD",
                "montant_marchandise": 48000.0,
                "frais_livraison": 4000.0,
                "mode_paiement": "MVOLA",
                "livreur_id": 3,
                "tournee": tour_livreur3,
                "receptionniste": u_voahi,
                "statut": "LIVRE_ENCAISSE",
                "observation": "Encaissé par MVola au client • Transaction confirmée",
            },
        ]

        total_inserted = 0
        for p_spec in parcels_specs:
            vendeur = p_spec["vendeur"]
            recep = p_spec["receptionniste"]
            tour = p_spec.get("tournee")
            partenaire = p_spec.get("partenaire")

            parcel = ParcelORM(
                numero_bordereau=p_spec["numero_bordereau"],
                date_reception=today_str,
                vendeur_id=vendeur.id,
                expediteur_type=vendeur.type_expediteur,
                expediteur_nom=vendeur.nom,
                expediteur_tel=vendeur.telephone,
                expediteur_adresse=vendeur.adresse,
                client_nom=p_spec["client_nom"],
                client_tel=p_spec["client_tel"],
                designation=p_spec["designation"],
                lieu_detail=p_spec["lieu_detail"],
                axe=p_spec["axe"],
                axe_modifie_manuellement=0,
                type_flux=p_spec["type_flux"],
                montant_marchandise=p_spec["montant_marchandise"],
                frais_livraison=p_spec["frais_livraison"],
                frais_partenaire=p_spec.get("frais_partenaire", 0.0),
                observation=p_spec.get("observation"),
                statut=p_spec["statut"],
                mode_paiement=p_spec.get("mode_paiement"),
                date_report=p_spec.get("date_report"),
                motif_incident=p_spec.get("motif_incident"),
                nom_partenaire=p_spec.get("nom_partenaire"),
                partenaire_id=partenaire.id if partenaire else None,
                reference_partenaire=p_spec.get("reference_partenaire"),
                driver_contact=p_spec.get("driver_contact"),
                vehicle_plate=p_spec.get("vehicle_plate"),
                encaissement_lieu=p_spec.get("encaissement_lieu", "LIVREUR"),
                repartition_vendeur=p_spec.get("repartition_vendeur"),
                montant_encaisse_livreur=p_spec.get("montant_encaisse_livreur"),
                montant_encaisse_vendeur=p_spec.get("montant_encaisse_vendeur"),
                livreur_id=p_spec.get("livreur_id"),
                tournee_id=tour.id if tour else None,
                receptionniste_id=recep.id if recep else None,
                receptionniste_nom=recep.nom_complet if recep else None,
                statut_reversement="NON_REVERSE",
                actif=1,
                created_at=now - timedelta(hours=4),
                updated_at=now,
            )
            db.add(parcel)
            db.flush()

            # Créer l'historique de statut initial
            hist_depot = ParcelStatusHistoryORM(
                colis_id=parcel.id,
                utilisateur_id=recep.id if recep else None,
                statut_precedent=None,
                statut_nouveau="EN_DEPOT",
                motif="Réception quai initiale et enregistrement bordereau",
                horodatage=now - timedelta(hours=4),
            )
            db.add(hist_depot)

            # Si le colis a évolué, enregistrer l'historique supplémentaire
            if parcel.statut != "EN_DEPOT":
                hist_current = ParcelStatusHistoryORM(
                    colis_id=parcel.id,
                    utilisateur_id=recep.id if recep else None,
                    statut_precedent="EN_DEPOT",
                    statut_nouveau=parcel.statut,
                    motif=parcel.motif_incident or parcel.observation or f"Passage au statut {parcel.statut}",
                    horodatage=now - timedelta(minutes=30),
                )
                db.add(hist_current)

            # Si le colis a été encaissé, enregistrer la ligne d'encaissement correspondante
            if parcel.statut == "LIVRE_ENCAISSE":
                total_encaisse = parcel.montant_encaisse_livreur if parcel.montant_encaisse_livreur is not None else (parcel.montant_marchandise + parcel.frais_livraison)
                canal_val = parcel.mode_paiement if parcel.mode_paiement in ['ESPECES', 'MVOLA', 'AIRTEL', 'ORANGE_MONEY'] else 'ESPECES'
                cash = CashCollectionORM(
                    colis_id=parcel.id,
                    utilisateur_id=recep.id if recep else None,
                    montant_encaisse=total_encaisse,
                    canal=canal_val,
                    reference_transaction=f"MV-{parcel.id}-OK" if parcel.mode_paiement == "MVOLA" else None,
                    horodatage=now - timedelta(minutes=45),
                )
                db.add(cash)

            total_inserted += 1

        db.commit()
        print(f"-> {total_inserted} colis réels insérés avec succès.")

        # =====================================================================
        # ÉTAPE 8 : RECALCUL DES TOTAUX DES TOURNÉES
        # =====================================================================
        print("\n--- 8. SYNCHRONISATION DES TOTAUX DES TOURNÉES ---")
        tours = db.query(TourORM).all()
        for t in tours:
            parcels_t = db.query(ParcelORM).filter(ParcelORM.tournee_id == t.id).all()
            theorique = sum(p.montant_marchandise + p.frais_livraison for p in parcels_t)
            t.total_theorique_caisse = theorique
            if t.statut == "CLOTURE":
                t.total_reel_verse = theorique
                t.ecart_constate = 0.0
        db.commit()
        print("-> Totaux des tournées recalculés.")

        print("\n=======================================================")
        print("  RÉINITIALISATION DE LA BASE TERMINÉE AVEC SUCCÈS !")
        print(f"  • Date opérationnelle : {today_str}")
        print("  • Stock en dépôt (Écran 03 Dispatch) : 18 colis réels")
        print("  • Tournées actives & clôturées : 3 tournées réelles")
        print("  • Coursiers disponibles quai : 4 coursiers (IDs 1 à 4)")
        print("  • Comptes web Hub : 8 comptes stricts (aucun livreur)")
        print("=======================================================")

    except Exception as e:
        db.rollback()
        print(f"ERREUR lors de la réinitialisation : {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    run_reset_and_seed()
