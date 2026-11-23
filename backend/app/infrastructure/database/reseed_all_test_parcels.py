"""Script to clean and reseed test parcels with 100% realistic production data."""

from datetime import datetime, date, timedelta
from sqlalchemy import text
from backend.app.infrastructure.database.connection import SessionLocal, engine
from backend.app.infrastructure.persistence.models import (
    Base,
    UserORM,
    CourierORM,
    VendorORM,
    AxisORM,
    ZoneORM,
    PartnerORM,
    TourORM,
    ParcelORM,
    ParcelStatusHistoryORM,
    CashCollectionORM,
    PerformanceEvaluationORM,
)

def reseed():
    db = SessionLocal()
    try:
        print("=== 1. NETTOYAGE COMPLET DE TOUS LES COLIS ET DONNÉES OPÉRATIONNELLES ===")
        # 1.1 Supprimer les enfants et dépendances
        db.execute(text("DELETE FROM remboursements_dettes;"))
        db.execute(text("DELETE FROM dettes_livreurs;"))
        db.execute(text("DELETE FROM encaissements;"))
        db.execute(text("DELETE FROM colis_statut_historique;"))
        db.execute(text("DELETE FROM evaluations_performance;"))
        
        # 1.2 Casser les liaisons
        db.execute(text("UPDATE colis SET reversement_id = NULL, tournee_id = NULL, livreur_id = NULL;"))
        
        # 1.3 Supprimer les colis, tournées et reversements
        deleted_parcels = db.execute(text("DELETE FROM colis;")).rowcount
        deleted_tours = db.execute(text("DELETE FROM tournees;")).rowcount
        deleted_payouts = db.execute(text("DELETE FROM reversements_vendeurs;")).rowcount
        print(f"Colis supprimés : {deleted_parcels}")
        print(f"Tournées supprimées : {deleted_tours}")
        print(f"Reversements supprimés : {deleted_payouts}")

        # 1.4 Réinitialiser les séquences pour redémarrer proprement à 1
        sequences = [
            "colis_id_seq",
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
                print(f"Notice sequence {seq}: {e}")

        # 1.5 Mettre à jour la contrainte colis.type_flux pour accepter 'ENTREPRISE'
        try:
            db.execute(text("ALTER TABLE colis DROP CONSTRAINT IF EXISTS colis_type_flux_check;"))
            db.execute(text("ALTER TABLE colis ADD CONSTRAINT colis_type_flux_check CHECK (type_flux IN ('COD', 'SIMPLE', 'RETOUR', 'PROVINCE', 'ENTREPRISE'));"))
            print("Contrainte colis.type_flux mise à jour (COD, SIMPLE, RETOUR, PROVINCE, ENTREPRISE).")
        except Exception as e:
            print(f"Notice constraint type_flux: {e}")

        db.commit()

        print("\n=== 2. RÉCUPÉRATION DES RÉFÉRENTIELS (AGENTS, LIVREURS, VENDEURS, PARTENAIRES) ===")
        # Agents de réception
        receptionists = db.query(UserORM).filter(UserORM.role == "RECEPTIONNISTE").all()
        rec_map = {r.username: r for r in receptionists}
        print(f"Agents réception trouvés : {[r.nom_complet for r in receptionists]}")

        # Livreurs
        couriers = db.query(CourierORM).filter(CourierORM.actif == 1).order_by(CourierORM.id).all()
        c1 = couriers[0] if len(couriers) > 0 else None
        c2 = couriers[1] if len(couriers) > 1 else None
        c3 = couriers[2] if len(couriers) > 2 else None
        print(f"Livreurs disponibles : {[c.nom for c in couriers]}")

        # Vendeurs
        v_modtana = db.query(VendorORM).filter(VendorORM.nom.ilike("%Mod'Tanà%")).first()
        v_audit = db.query(VendorORM).filter(VendorORM.type_expediteur == "ENTREPRISE").first()
        v_particulier = db.query(VendorORM).filter(VendorORM.type_expediteur == "PARTICULIER").first()
        
        # Fallbacks si absents
        if not v_modtana:
            v_modtana = VendorORM(
                nom="Mod'Tanà Boutique",
                type_expediteur="CYBERMARCHAND",
                telephone="0345566778",
                contact_responsable="Madame Voahirana",
                adresse="Box 14, Pavillon Analakely",
                modalite_paiement="COMPTANT",
                actif=1,
            )
            db.add(v_modtana)
            db.flush()

        if not v_audit:
            v_audit = VendorORM(
                nom="Cabinet Juridique & Audit Tanà",
                type_expediteur="ENTREPRISE",
                telephone="0329988776",
                contact_responsable="Maître Andry Rabemananjara",
                adresse="Immeuble ARO, 3e étage, Antsakaviro",
                modalite_paiement="FACTURE_MENSUELLE",
                nif_stat="4001234567 / 2021",
                actif=1,
            )
            db.add(v_audit)
            db.flush()

        if not v_particulier:
            v_particulier = VendorORM(
                nom="Rasoamalala Hanta (Envoi Personnel)",
                type_expediteur="PARTICULIER",
                telephone="0331234599",
                contact_responsable="Hanta Rasoamalala",
                adresse="Lot IVG 34 Ambohimanarina",
                modalite_paiement="COMPTANT",
                actif=1,
            )
            db.add(v_particulier)
            db.flush()

        # Partenaires Province (Gares & Coopératives)
        p_cotisse = db.query(PartnerORM).filter(PartnerORM.nom.ilike("%Cotisse%")).first()
        p_soatrans = db.query(PartnerORM).filter(PartnerORM.nom.ilike("%Soatrans%")).first()
        p_besady = db.query(PartnerORM).filter(PartnerORM.nom.ilike("%Besady%")).first()
        p_kofmad = db.query(PartnerORM).filter(PartnerORM.nom.ilike("%Kofmad%")).first()

        today_str = date.today().strftime("%Y-%m-%d")

        print("\n=== 3. CRÉATION DES TOURNÉES DE DISTRIBUTION TEST ===")
        # Tournée 1 : En cours (Livreur 01 Rakoto Jean)
        tour_active = TourORM(
            date_tournee=today_str,
            livreur_id=c1.id if c1 else 1,
            statut="EN_COURS",
            total_theorique_caisse=0.0,
            total_reel_verse=0.0,
            ecart_constate=0.0,
            created_at=datetime.utcnow() - timedelta(hours=3),
        )
        db.add(tour_active)
        db.flush()

        # Tournée 2 : Clôturée & Encaissée (Livreur 02 Rabe Michel)
        tour_closed = TourORM(
            date_tournee=today_str,
            livreur_id=c2.id if c2 else 2,
            statut="CLOTURE",
            total_theorique_caisse=135000.0,
            total_reel_verse=135000.0,
            ecart_constate=0.0,
            cloture_a=datetime.utcnow() - timedelta(hours=1),
            created_at=datetime.utcnow() - timedelta(hours=5),
        )
        db.add(tour_closed)
        db.flush()

        print(f"Tournées créées : #{tour_active.id} (EN_COURS) et #{tour_closed.id} (CLOTURE)")

        print("\n=== 4. CRÉATION DES COLIS DE TEST MULTI-FLUX RÉELS ===")

        # Helper pour récupérer un agent
        def get_agent(username, fallback_nom):
            if username in rec_map:
                return rec_map[username].id, rec_map[username].nom_complet
            return 4, fallback_nom

        id_aina, nom_aina = get_agent("recep_cod", "Aina Razafy")
        id_faly, nom_faly = get_agent("recep_simple", "Faly Rabe")
        id_hery, nom_hery = get_agent("recep_province", "Hery Andrianina")
        id_voahi, nom_voahi = get_agent("recep_retour", "Voahirana Rasoanaivo")
        id_mamy, nom_mamy = get_agent("recep_b2b", "Mamy Rakotomalala")

        test_parcels = [
            # -------------------------------------------------------------
            # FLUX 1 : COD URBAIN (Contre-Remboursement Grand Tanà)
            # -------------------------------------------------------------
            {
                "numero_bordereau": "BDR-COD-0001",
                "vendeur_id": v_modtana.id,
                "expediteur_type": "CYBERMARCHAND",
                "expediteur_nom": v_modtana.nom,
                "expediteur_tel": v_modtana.telephone,
                "expediteur_adresse": v_modtana.adresse,
                "client_nom": "Rasoa Nirina",
                "client_tel": "0341234567",
                "designation": "Robe de soirée velours & Sandales",
                "lieu_detail": "Analakely, Pavillon 14 en face pharmacie",
                "axe": "AXE_CENTRE_1",
                "type_flux": "COD",
                "montant_marchandise": 45000.0,
                "frais_livraison": 3000.0,
                "frais_partenaire": 0.0,
                "statut": "EN_DEPOT",
                "mode_paiement": "ESPECES",
                "receptionniste_id": id_aina,
                "receptionniste_nom": nom_aina,
                "observation": "Livraison matinale demandée avant midi",
            },
            {
                "numero_bordereau": "BDR-COD-0002",
                "vendeur_id": v_modtana.id,
                "expediteur_type": "CYBERMARCHAND",
                "expediteur_nom": v_modtana.nom,
                "expediteur_tel": v_modtana.telephone,
                "expediteur_adresse": v_modtana.adresse,
                "client_nom": "Andry Rivo",
                "client_tel": "0324455667",
                "designation": "Paire Sneakers Nike Air Max pointure 42",
                "lieu_detail": "Ankorondrano, Immeuble FITIA 2e étage",
                "axe": "AXE_NORD_1",
                "type_flux": "COD",
                "montant_marchandise": 85000.0,
                "frais_livraison": 3000.0,
                "frais_partenaire": 0.0,
                "statut": "ASSIGNE",
                "livreur_id": c1.id if c1 else 1,
                "tournee_id": tour_active.id,
                "mode_paiement": "ESPECES",
                "receptionniste_id": id_aina,
                "receptionniste_nom": nom_aina,
                "observation": "Appeler 15 min à l'avance pour descendre",
            },
            {
                "numero_bordereau": "BDR-COD-0003",
                "vendeur_id": v_modtana.id,
                "expediteur_type": "CYBERMARCHAND",
                "expediteur_nom": v_modtana.nom,
                "expediteur_tel": v_modtana.telephone,
                "expediteur_adresse": v_modtana.adresse,
                "client_nom": "Voahangy Lala",
                "client_tel": "0331122334",
                "designation": "Pack Produits Cosmétiques Bio Tanà",
                "lieu_detail": "Tanjombato, près Jumbo Score",
                "axe": "AXE_SUD_1",
                "type_flux": "COD",
                "montant_marchandise": 30000.0,
                "frais_livraison": 4000.0,
                "frais_partenaire": 0.0,
                "statut": "EN_COURS",
                "livreur_id": c1.id if c1 else 1,
                "tournee_id": tour_active.id,
                "mode_paiement": "MVOLA",
                "receptionniste_id": id_faly,
                "receptionniste_nom": nom_faly,
                "observation": "En cours de livraison dans la tournée active",
            },
            {
                "numero_bordereau": "BDR-COD-0004",
                "vendeur_id": v_modtana.id,
                "expediteur_type": "CYBERMARCHAND",
                "expediteur_nom": v_modtana.nom,
                "expediteur_tel": v_modtana.telephone,
                "expediteur_adresse": v_modtana.adresse,
                "client_nom": "Herisoa Mamy",
                "client_tel": "0349988776",
                "designation": "Montre connectée Smartwatch Pro",
                "lieu_detail": "Itaosy Cité, près Pharmacie Principale",
                "axe": "AXE_OUEST_1",
                "type_flux": "COD",
                "montant_marchandise": 60000.0,
                "frais_livraison": 4000.0,
                "frais_partenaire": 0.0,
                "statut": "LIVRE_ENCAISSE",
                "livreur_id": c2.id if c2 else 2,
                "tournee_id": tour_closed.id,
                "mode_paiement": "ESPECES",
                "receptionniste_id": id_aina,
                "receptionniste_nom": nom_aina,
                "observation": "Livré avec succès et encaissé en espèces",
            },
            {
                "numero_bordereau": "BDR-COD-0005",
                "vendeur_id": v_modtana.id,
                "expediteur_type": "CYBERMARCHAND",
                "expediteur_nom": v_modtana.nom,
                "expediteur_tel": v_modtana.telephone,
                "expediteur_adresse": v_modtana.adresse,
                "client_nom": "Tiana Rakotobe",
                "client_tel": "0347711223",
                "designation": "Sac à dos en cuir véritable Tanà",
                "lieu_detail": "Sabotsy Namehana, marché communal",
                "axe": "AXE_NORD_EST_1",
                "type_flux": "COD",
                "montant_marchandise": 75000.0,
                "frais_livraison": 4000.0,
                "frais_partenaire": 0.0,
                "statut": "EN_DEPOT",
                "mode_paiement": "ESPECES",
                "receptionniste_id": id_faly,
                "receptionniste_nom": nom_faly,
                "observation": "En attente de dispatching pour tournée Nord-Est",
            },
            {
                "numero_bordereau": "BDR-COD-0006",
                "vendeur_id": v_modtana.id,
                "expediteur_type": "CYBERMARCHAND",
                "expediteur_nom": v_modtana.nom,
                "expediteur_tel": v_modtana.telephone,
                "expediteur_adresse": v_modtana.adresse,
                "client_nom": "Mialy Ramanantoanina",
                "client_tel": "0323344556",
                "designation": "Parure draps de lit broderie malgache",
                "lieu_detail": "Andoharanofotsy, route nationale 7",
                "axe": "AXE_SUD_1",
                "type_flux": "COD",
                "montant_marchandise": 50000.0,
                "frais_livraison": 4000.0,
                "frais_partenaire": 0.0,
                "statut": "REPORTE",
                "date_report": (date.today() + timedelta(days=1)).strftime("%Y-%m-%d"),
                "motif_incident": "Client injoignable par téléphone après 3 tentatives",
                "mode_paiement": "ESPECES",
                "receptionniste_id": id_mamy,
                "receptionniste_nom": nom_mamy,
                "observation": "À relivrer le lendemain matin",
            },

            # -------------------------------------------------------------
            # FLUX 2 : SIMPLE / PORT PAYÉ (0 Ar Marchandise)
            # -------------------------------------------------------------
            {
                "numero_bordereau": "BDR-SMP-0007",
                "vendeur_id": v_audit.id,
                "expediteur_type": "ENTREPRISE",
                "expediteur_nom": v_audit.nom,
                "expediteur_tel": v_audit.telephone,
                "expediteur_adresse": v_audit.adresse,
                "client_nom": "Étude Notariale Maître Solo",
                "client_tel": "0345544332",
                "designation": "Pli confidentiel • Acte notarié sous scellé",
                "lieu_detail": "Antsahavola, Immeuble Ny Havana",
                "axe": "AXE_CENTRE_1",
                "type_flux": "SIMPLE",
                "montant_marchandise": 0.0,
                "frais_livraison": 3000.0,
                "frais_partenaire": 0.0,
                "statut": "EN_DEPOT",
                "mode_paiement": "ESPECES",
                "receptionniste_id": id_faly,
                "receptionniste_nom": nom_faly,
                "observation": "Port payé au dépôt • Remise en main propre contre signature",
            },
            {
                "numero_bordereau": "BDR-SMP-0008",
                "vendeur_id": v_particulier.id,
                "expediteur_type": "PARTICULIER",
                "expediteur_nom": v_particulier.nom,
                "expediteur_tel": v_particulier.telephone,
                "expediteur_adresse": v_particulier.adresse,
                "client_nom": "Dr Raveloarison Philippe",
                "client_tel": "0337788990",
                "designation": "Dossier médical d'analyse biologique",
                "lieu_detail": "Ampefiloha, Clinique des Soeurs",
                "axe": "AXE_OUEST_1",
                "type_flux": "SIMPLE",
                "montant_marchandise": 0.0,
                "frais_livraison": 3000.0,
                "frais_partenaire": 0.0,
                "statut": "LIVRE",
                "livreur_id": c2.id if c2 else 2,
                "tournee_id": tour_closed.id,
                "mode_paiement": "ESPECES",
                "receptionniste_id": id_hery,
                "receptionniste_nom": nom_hery,
                "observation": "Livré au secrétariat médical • Émargement reçu",
            },

            # -------------------------------------------------------------
            # FLUX 3 : PROVINCE (Gares Routières & Coopératives)
            # -------------------------------------------------------------
            {
                "numero_bordereau": "BDR-PRV-0009",
                "vendeur_id": v_modtana.id,
                "expediteur_type": "CYBERMARCHAND",
                "expediteur_nom": v_modtana.nom,
                "expediteur_tel": v_modtana.telephone,
                "expediteur_adresse": v_modtana.adresse,
                "client_nom": "Rasoanirina Christine",
                "client_tel": "0341100223",
                "designation": "Robes d'été & Accessoires mode",
                "lieu_detail": "Gare Ambodivona vers Toamasina Port (Retrait Cotisse)",
                "axe": "AXE_PROVINCE",
                "type_flux": "PROVINCE",
                "montant_marchandise": 120000.0,
                "frais_livraison": 15000.0,
                "frais_partenaire": 12000.0,
                "nom_partenaire": p_cotisse.nom if p_cotisse else "Cotisse Transport VIP & Colis",
                "partenaire_id": p_cotisse.id if p_cotisse else None,
                "statut": "EN_DEPOT",
                "mode_paiement": "ESPECES",
                "receptionniste_id": id_hery,
                "receptionniste_nom": nom_hery,
                "observation": "En attente de ramassage par la navette gares (transit Ambodivona)",
            },
            {
                "numero_bordereau": "BDR-PRV-0010",
                "vendeur_id": v_particulier.id,
                "expediteur_type": "PARTICULIER",
                "expediteur_nom": v_particulier.nom,
                "expediteur_tel": v_particulier.telephone,
                "expediteur_adresse": v_particulier.adresse,
                "client_nom": "Rakotomalala Jean-Luc",
                "client_tel": "0325566778",
                "designation": "Pièces mécaniques moto 125cc",
                "lieu_detail": "Moramanga Centre via Gare Ambodivona",
                "axe": "AXE_PROVINCE",
                "type_flux": "PROVINCE",
                "montant_marchandise": 65000.0,
                "frais_livraison": 10000.0,
                "frais_partenaire": 8000.0,
                "nom_partenaire": p_soatrans.nom if p_soatrans else "Soatrans Coopérative Est",
                "partenaire_id": p_soatrans.id if p_soatrans else None,
                "statut": "ASSIGNE",
                "livreur_id": c3.id if c3 else (c1.id if c1 else 1),
                "mode_paiement": "ESPECES",
                "receptionniste_id": id_aina,
                "receptionniste_nom": nom_aina,
                "observation": "Assigné au chauffeur navette pour dépôt Ambodivona",
            },
            {
                "numero_bordereau": "BDR-PRV-0011",
                "vendeur_id": v_modtana.id,
                "expediteur_type": "CYBERMARCHAND",
                "expediteur_nom": v_modtana.nom,
                "expediteur_tel": v_modtana.telephone,
                "expediteur_adresse": v_modtana.adresse,
                "client_nom": "Andrianasolo Toky",
                "client_tel": "0334455667",
                "designation": "Smartphone 4G & Écouteurs sans fil",
                "lieu_detail": "Mahajanga Bord de Mer via Gare Andohatapenaka (Besady)",
                "axe": "AXE_PROVINCE",
                "type_flux": "PROVINCE",
                "montant_marchandise": 95000.0,
                "frais_livraison": 18000.0,
                "frais_partenaire": 14000.0,
                "nom_partenaire": p_besady.nom if p_besady else "Besady Plus Transport",
                "partenaire_id": p_besady.id if p_besady else None,
                "reference_partenaire": "BES-2026-9021",
                "driver_contact": "Jean 033 44 555 66",
                "vehicle_plate": "5122 TBD",
                "statut": "SOUS_TRAITE",
                "mode_paiement": "ESPECES",
                "receptionniste_id": id_voahi,
                "receptionniste_nom": nom_voahi,
                "observation": "Déposé au guichet Besady Maki • En cours de trajet vers Majunga",
            },
            {
                "numero_bordereau": "BDR-PRV-0012",
                "vendeur_id": v_modtana.id,
                "expediteur_type": "CYBERMARCHAND",
                "expediteur_nom": v_modtana.nom,
                "expediteur_tel": v_modtana.telephone,
                "expediteur_adresse": v_modtana.adresse,
                "client_nom": "Razafindrakoto Paul",
                "client_tel": "0342233445",
                "designation": "Veste en cuir doublée & Bottines",
                "lieu_detail": "Antsirabe Ville d'Eaux via Gare Fasan'ny Karana",
                "axe": "AXE_PROVINCE",
                "type_flux": "PROVINCE",
                "montant_marchandise": 110000.0,
                "frais_livraison": 12000.0,
                "frais_partenaire": 9000.0,
                "nom_partenaire": p_kofmad.nom if p_kofmad else "Kofmad Transport Sud",
                "partenaire_id": p_kofmad.id if p_kofmad else None,
                "reference_partenaire": "KOF-2026-4412",
                "statut": "LIVRE_ENCAISSE",
                "mode_paiement": "MVOLA",
                "receptionniste_id": id_hery,
                "receptionniste_nom": nom_hery,
                "observation": "Retiré au guichet coopérative • Fonds COD reçus par transfert Mvola",
            },

            # -------------------------------------------------------------
            # FLUX 4 : RETOUR SAV / ÉCHANGE
            # -------------------------------------------------------------
            {
                "numero_bordereau": "BDR-RET-0013",
                "vendeur_id": v_modtana.id,
                "expediteur_type": "CYBERMARCHAND",
                "expediteur_nom": v_modtana.nom,
                "expediteur_tel": v_modtana.telephone,
                "expediteur_adresse": v_modtana.adresse,
                "client_nom": "Rivo Rajaona (Client SAV)",
                "client_tel": "0348899001",
                "designation": "Retour Chaussures pointure 41 (Échange vers pointure 42)",
                "lieu_detail": "67 Ha Sud, près Marché Couvert",
                "axe": "AXE_OUEST_1",
                "type_flux": "RETOUR",
                "montant_marchandise": 0.0,
                "frais_livraison": 3000.0,
                "frais_partenaire": 0.0,
                "statut": "EN_DEPOT",
                "mode_paiement": "ESPECES",
                "receptionniste_id": id_voahi,
                "receptionniste_nom": nom_voahi,
                "observation": "Retour SAV en attente de traitement quai et réexpédition",
            },
            {
                "numero_bordereau": "BDR-RET-0014",
                "vendeur_id": v_modtana.id,
                "expediteur_type": "CYBERMARCHAND",
                "expediteur_nom": v_modtana.nom,
                "expediteur_tel": v_modtana.telephone,
                "expediteur_adresse": v_modtana.adresse,
                "client_nom": "Solohery Jean",
                "client_tel": "0331234560",
                "designation": "Chemise rayée homme (Refusée client à la livraison)",
                "lieu_detail": "Analakely, Pavillon 14",
                "axe": "AXE_CENTRE_1",
                "type_flux": "RETOUR",
                "montant_marchandise": 0.0,
                "frais_livraison": 3000.0,
                "frais_partenaire": 0.0,
                "statut": "RETOUR_BOUTIQUE",
                "mode_paiement": "ESPECES",
                "receptionniste_id": id_voahi,
                "receptionniste_nom": nom_voahi,
                "observation": "Colis refusé retourné physiquement au donneur d'ordre au quai",
            },

            # -------------------------------------------------------------
            # FLUX 5 : ENTREPRISE / CONTRAT B2B
            # -------------------------------------------------------------
            {
                "numero_bordereau": "BDR-ENT-0015",
                "vendeur_id": v_audit.id,
                "expediteur_type": "ENTREPRISE",
                "expediteur_nom": v_audit.nom,
                "expediteur_tel": v_audit.telephone,
                "expediteur_adresse": v_audit.adresse,
                "client_nom": "Direction Générale BNI Madagascar",
                "client_tel": "0320011223",
                "designation": "Dossier d'Audit & Contrat-Cadre Annuel B2B",
                "lieu_detail": "Analakely, Siège Social BNI Madagascar",
                "axe": "AXE_CENTRE_1",
                "type_flux": "ENTREPRISE",
                "montant_marchandise": 0.0,
                "frais_livraison": 3000.0,
                "frais_partenaire": 0.0,
                "statut": "EN_DEPOT",
                "mode_paiement": "VIREMENT",
                "receptionniste_id": id_mamy,
                "receptionniste_nom": nom_mamy,
                "observation": "Compte Entreprise • Facturation mensuelle groupée",
            },
            {
                "numero_bordereau": "BDR-ENT-0016",
                "vendeur_id": v_audit.id,
                "expediteur_type": "ENTREPRISE",
                "expediteur_nom": v_audit.nom,
                "expediteur_tel": v_audit.telephone,
                "expediteur_adresse": v_audit.adresse,
                "client_nom": "Groupe Sipromad Holding",
                "client_tel": "0340055667",
                "designation": "Rapport Financier Semestriel sous pli scellé",
                "lieu_detail": "Ankorondrano, Tour Redland 10e étage",
                "axe": "AXE_NORD_1",
                "type_flux": "ENTREPRISE",
                "montant_marchandise": 0.0,
                "frais_livraison": 3000.0,
                "frais_partenaire": 0.0,
                "statut": "LIVRE",
                "livreur_id": c2.id if c2 else 2,
                "tournee_id": tour_closed.id,
                "mode_paiement": "VIREMENT",
                "receptionniste_id": id_mamy,
                "receptionniste_nom": nom_mamy,
                "observation": "Remis au secrétariat de direction • Décharge signée",
            },
        ]

        inserted_count = 0
        for p_data in test_parcels:
            parcel = ParcelORM(
                date_reception=today_str,
                actif=1,
                created_at=datetime.utcnow() - timedelta(minutes=inserted_count * 10),
                updated_at=datetime.utcnow(),
                **p_data
            )
            db.add(parcel)
            db.flush()
            inserted_count += 1

            # Créer l'historique de statut pour traçabilité
            history = ParcelStatusHistoryORM(
                colis_id=parcel.id,
                utilisateur_id=parcel.receptionniste_id,
                statut_precedent=None,
                statut_nouveau="EN_DEPOT",
                motif="Enregistrement initial au poste de réception quai",
                horodatage=parcel.created_at,
            )
            db.add(history)

            if parcel.statut != "EN_DEPOT":
                h2 = ParcelStatusHistoryORM(
                    colis_id=parcel.id,
                    utilisateur_id=parcel.receptionniste_id,
                    statut_precedent="EN_DEPOT",
                    statut_nouveau=parcel.statut,
                    motif=parcel.observation or f"Transition vers statut {parcel.statut}",
                    horodatage=datetime.utcnow(),
                )
                db.add(h2)

        # Mettre à jour le montant théorique de la tournée active (colis 2 et 3)
        tour_active.total_theorique_caisse = 85000.0 + 3000.0 + 30000.0 + 4000.0
        db.commit()

        print(f"\n Succès : {inserted_count} colis de test réalistes créés avec succès !")
        print("  - Flux COD : 6 colis (EN_DEPOT, ASSIGNE, EN_COURS, LIVRE_ENCAISSE, REPORTE)")
        print("  - Flux SIMPLE : 2 colis (EN_DEPOT, LIVRE)")
        print("  - Flux PROVINCE : 4 colis (EN_DEPOT, ASSIGNE, SOUS_TRAITE, LIVRE_ENCAISSE)")
        print("  - Flux RETOUR : 2 colis (EN_DEPOT, RETOUR_BOUTIQUE)")
        print("  - Flux ENTREPRISE : 2 colis (EN_DEPOT, LIVRE)")
        print("Toutes les traçabilités nominatives (Aina, Faly, Hery, Voahirana, Mamy) sont associées.")

    except Exception as e:
        db.rollback()
        print(f"Erreur lors du réensemencement : {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    reseed()
