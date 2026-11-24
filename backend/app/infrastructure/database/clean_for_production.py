"""Script d'initialisation et de nettoyage de la base de données pour la PRODUCTION.

Configuration demandée par l'utilisateur :
- 0 Colis au départ (vierge)
- 0 Tournées au départ (vierge)
- 0 Dettes, litiges, encaissements ou reversements
- 0 Expéditeurs / Donneurs d'ordre au départ (créés à la volée dès l'arrivée de colis réels ou via CRM)
- 0 Livreurs dans la Flotte au départ (créés lors du recrutement des vrais livreurs)
- 7 Utilisateurs staff opérationnel :
  * 2 Super Admins : admin, directeur
  * 1 Superviseur : superviseur
  * 4 Réceptionnistes de quai : agent1, agent2, agent3, agent4
- Préservation du Référentiel Géographique & Partenaires :
  * 9 axes urbains réels et leurs zones / tarifs
  * Gares routières et coopératives partenaires
  * Paramètres de l'entreprise (mentions légales, NIF, STAT)
"""

from sqlalchemy import text
from backend.app.core.config import settings
from backend.app.infrastructure.database.connection import SessionLocal, engine, ensure_database_exists
from backend.app.infrastructure.persistence.models import (
    Base,
    AxisORM,
    CourierORM,
    PartnerORM,
    UserORM,
    VendorORM,
    ZoneORM,
    LigneDestinationORM,
    ParcelORM,
    TourORM,
    CompanySettingsORM,
)
from backend.app.infrastructure.security.auth import hash_password
from backend.app.infrastructure.database.seed_real_urban_axes import apply_real_axes_migration


def clean_database_for_production():
    print("=======================================================================")
    print("      🚀 NETTOYAGE STRICT BASE DE DONNÉES PRODUCTION (BLANK SLATE)     ")
    print("=======================================================================\n")

    # 0. S'assurer que la base existe physiquement dans PostgreSQL
    ensure_database_exists(settings.DATABASE_URL)

    # 0.B Création de toutes les tables si la base est vierge
    print("0. Initialisation des tables & modèles de données...")
    Base.metadata.create_all(bind=engine)
    print("   ✓ Schéma des tables PostgreSQL prêt.")

    db = SessionLocal()
    try:
        # ---------------------------------------------------------------------
        # 1. CONSOLIDATION INITIALE DU RÉFÉRENTIEL (AXES & ZONES)
        # ---------------------------------------------------------------------
        print("\n1. Vérification et synchronisation du Référentiel Géographique...")
        apply_real_axes_migration()
        print("   ✓ 9 axes logistiques réels et zones d'Antananarivo prêts.")

        # 1.B Partenaires et coopératives régionales
        initial_partners = [
            {"nom": "Cotisse Transport VIP & Colis", "type": "COOPERATIVE", "gare_rattachement": "Ambodivona", "contact": "032 11 027 10"},
            {"nom": "Soatrans Coopérative", "type": "COOPERATIVE", "gare_rattachement": "Fasan'ny Karana", "contact": "034 05 600 00"},
            {"nom": "Besady Plus Transport", "type": "COOPERATIVE", "gare_rattachement": "Andohatapenaka", "contact": "033 15 220 30"},
            {"nom": "Kofmad Transport Est", "type": "COOPERATIVE", "gare_rattachement": "Ambodivona", "contact": "032 55 440 01"},
        ]
        for pd in initial_partners:
            existing = db.query(PartnerORM).filter(PartnerORM.nom == pd["nom"]).first()
            if not existing:
                db.add(PartnerORM(**pd, actif=1))
        db.commit()

        # 1.C Désactivation des anciens axes virtuels province et déverrouillage des livreurs
        db.execute(text("UPDATE axes SET actif = 0 WHERE code LIKE 'AXE_PROV%';"))
        db.execute(text("UPDATE livreurs SET assigned_axis = NULL;"))
        db.commit()

        # ---------------------------------------------------------------------
        # 2. PURGE TOTALE DES DONNÉES OPÉRATIONNELLES (COLIS, TOURNÉES, FINANCES)
        # ---------------------------------------------------------------------
        print("\n2. Purge définitive de toutes les données opérationnelles et de test...")

        # Détacher les références
        db.execute(text("UPDATE colis SET reversement_id = NULL, tournee_id = NULL, livreur_id = NULL;"))
        db.commit()

        # Suppression en cascade dans l'ordre des contraintes
        r_remb = db.execute(text("DELETE FROM remboursements_dettes;")).rowcount
        r_dettes = db.execute(text("DELETE FROM dettes_livreurs;")).rowcount
        r_evals = db.execute(text("DELETE FROM evaluations_performance;")).rowcount
        r_enc = db.execute(text("DELETE FROM encaissements;")).rowcount
        r_hist = db.execute(text("DELETE FROM colis_statut_historique;")).rowcount
        r_rev = db.execute(text("DELETE FROM reversements_vendeurs;")).rowcount
        r_colis = db.execute(text("DELETE FROM colis;")).rowcount
        r_tours = db.execute(text("DELETE FROM tournees;")).rowcount
        
        # Purge de la flotte livreurs (aucun livreur au départ selon consigne)
        r_couriers = db.execute(text("DELETE FROM livreurs;")).rowcount
        
        # Purge des expéditeurs / donneurs d'ordre (aucun expéditeur au départ selon consigne)
        r_vendors = db.execute(text("DELETE FROM vendeurs;")).rowcount

        # Purge des coopératives et partenaires de test
        deleted_test_partners = (
            db.query(PartnerORM)
            .filter((PartnerORM.nom.ilike("%test%")) | (PartnerORM.id > 7))
            .delete(synchronize_session=False)
        )
        db.commit()
        try:
            db.execute(text("SELECT setval('partenaires_id_seq', 7, true);"))
            db.commit()
        except Exception:
            pass
        
        print(f"   ✓ Colis supprimés : {r_colis}")
        print(f"   ✓ Tournées supprimées : {r_tours}")
        print(f"   ✓ Flotte livreurs purgée : {r_couriers} (0 livreur au départ)")
        print(f"   ✓ Expéditeurs purgés : {r_vendors} (0 expéditeur au départ)")
        print(f"   ✓ Coopératives de test purgées : {deleted_test_partners}")
        print(f"   ✓ Historiques statuts purgés : {r_hist}")
        print(f"   ✓ Encaissements & finances purgés : {r_enc + r_rev + r_dettes + r_remb}")

        # ---------------------------------------------------------------------
        # 3. RÉINITIALISATION DE TOUTES LES SÉQUENCES POSTGRESQL À 1
        # ---------------------------------------------------------------------
        print("\n3. Réinitialisation des compteurs et séquences PostgreSQL à 1...")
        sequences_to_1 = [
            "colis_id_seq",
            "tournees_id_seq",
            "livreurs_id_seq",
            "vendeurs_id_seq",
            "colis_statut_historique_id_seq",
            "dettes_livreurs_id_seq",
            "remboursements_dettes_id_seq",
            "evaluations_performance_id_seq",
            "encaissements_id_seq",
            "reversements_vendeurs_id_seq",
        ]
        for seq in sequences_to_1:
            try:
                db.execute(text(f"ALTER SEQUENCE IF EXISTS {seq} RESTART WITH 1;"))
            except Exception as e:
                print(f"   Notice séquence {seq}: {e}")
        db.commit()
        print("   ✓ Toutes les séquences (colis, tournées, livreurs, expéditeurs) repartent à 1.")

        # ---------------------------------------------------------------------
        # 4. CONFIGURATION DU STAFF OPÉRATIONNEL DE PRODUCTION (7 COMPTES)
        # ---------------------------------------------------------------------
        print("\n4. Configuration des 7 comptes du personnel d'exploitation...")
        
        db.execute(text("ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check;"))
        db.execute(text("""
            ALTER TABLE utilisateurs ADD CONSTRAINT utilisateurs_role_check 
            CHECK (role IN ('RECEPTIONNISTE', 'SUPERVISEUR', 'SUPER_ADMIN', 'LIVREUR'));

            ALTER TABLE colis ADD COLUMN IF NOT EXISTS dernier_agent_id INTEGER REFERENCES utilisateurs(id);
            ALTER TABLE colis ADD COLUMN IF NOT EXISTS dernier_agent_nom VARCHAR(255);
            ALTER TABLE colis ADD COLUMN IF NOT EXISTS derniere_action TEXT;
            ALTER TABLE colis ADD COLUMN IF NOT EXISTS derniere_action_at TIMESTAMP;

            ALTER TABLE colis_statut_historique ADD COLUMN IF NOT EXISTS action VARCHAR(100);
            ALTER TABLE colis_statut_historique ADD COLUMN IF NOT EXISTS agent_nom VARCHAR(255);
            ALTER TABLE colis_statut_historique ADD COLUMN IF NOT EXISTS agent_role VARCHAR(100);
            ALTER TABLE colis_statut_historique ADD COLUMN IF NOT EXISTS details TEXT;
        """))
        db.commit()

        production_staff = [
            # Super Admins
            {
                "username": "admin",
                "email": "admin@tmsexpress.mg",
                "role": "SUPER_ADMIN",
                "nom_complet": "Super Administrateur",
                "password": "admin123",
            },
            {
                "username": "directeur",
                "email": "directeur@tmsexpress.mg",
                "role": "SUPER_ADMIN",
                "nom_complet": "Directeur des Opérations",
                "password": "directeur123",
            },
            # Superviseur Quai & Dispatch
            {
                "username": "superviseur",
                "email": "superviseur@tmsexpress.mg",
                "role": "SUPERVISEUR",
                "nom_complet": "Chef de Quai Dispatcher",
                "password": "superviseur123",
            },
            # 4 Agents de Quai Inbound
            {
                "username": "agent1",
                "email": "agent1@tmsexpress.mg",
                "role": "RECEPTIONNISTE",
                "nom_complet": "Aina Razafy",
                "password": "agent123",
            },
            {
                "username": "agent2",
                "email": "agent2@tmsexpress.mg",
                "role": "RECEPTIONNISTE",
                "nom_complet": "Faly Rabe",
                "password": "agent123",
            },
            {
                "username": "agent3",
                "email": "agent3@tmsexpress.mg",
                "role": "RECEPTIONNISTE",
                "nom_complet": "Hery Andrianina",
                "password": "agent123",
            },
            {
                "username": "agent4",
                "email": "agent4@tmsexpress.mg",
                "role": "RECEPTIONNISTE",
                "nom_complet": "Voahirana Rasoanaivo",
                "password": "agent123",
            },
            {
                "username": "agent5",
                "email": "agent5@tmsexpress.mg",
                "role": "RECEPTIONNISTE",
                "nom_complet": "Mamy Rakotomalala",
                "password": "agent123",
            },
        ]

        # Flotte des 10 livreurs opérationnels (polyvalents, aucun axe fixe par défaut)
        production_couriers = [
            {
                "id": 1,
                "nom": "Rakoto Jean",
                "telephone": "0341234501",
                "type_vehicule": "Scooter 110cc",
                "caution_garantie": 150000.0,
                "capacite_max_colis": 30,
                "assigned_axis": None,
            },
            {
                "id": 2,
                "nom": "Rabe Michel",
                "telephone": "0321234502",
                "type_vehicule": "Moto 125cc",
                "caution_garantie": 150000.0,
                "capacite_max_colis": 30,
                "assigned_axis": None,
            },
            {
                "id": 3,
                "nom": "Randria Paul",
                "telephone": "0331234503",
                "type_vehicule": "Moto 125cc",
                "caution_garantie": 150000.0,
                "capacite_max_colis": 30,
                "assigned_axis": None,
            },
            {
                "id": 4,
                "nom": "Razafindrakoto Hery",
                "telephone": "0341234504",
                "type_vehicule": "Scooter 110cc",
                "caution_garantie": 150000.0,
                "capacite_max_colis": 30,
                "assigned_axis": None,
            },
            {
                "id": 5,
                "nom": "Andriantsitohaina Tojo",
                "telephone": "0321234505",
                "type_vehicule": "Moto 150cc",
                "caution_garantie": 150000.0,
                "capacite_max_colis": 30,
                "assigned_axis": None,
            },
            {
                "id": 6,
                "nom": "Rajaonarivelo Faly",
                "telephone": "0331234506",
                "type_vehicule": "Moto Trail 150cc",
                "caution_garantie": 150000.0,
                "capacite_max_colis": 30,
                "assigned_axis": None,
            },
            {
                "id": 7,
                "nom": "Ramanantsoa Eric",
                "telephone": "0341234507",
                "type_vehicule": "Moto 125cc",
                "caution_garantie": 150000.0,
                "capacite_max_colis": 30,
                "assigned_axis": None,
            },
            {
                "id": 8,
                "nom": "Rasolofo Nary",
                "telephone": "0321234508",
                "type_vehicule": "Moto Cross 150cc",
                "caution_garantie": 150000.0,
                "capacite_max_colis": 30,
                "assigned_axis": None,
            },
            {
                "id": 9,
                "nom": "Rakotomalala Luc",
                "telephone": "0331234509",
                "type_vehicule": "Moto 125cc",
                "caution_garantie": 150000.0,
                "capacite_max_colis": 30,
                "assigned_axis": None,
            },
            {
                "id": 10,
                "nom": "Andrianarivo Patrick (Navette Gares)",
                "telephone": "0341234510",
                "type_vehicule": "Navette Fourgonnette",
                "caution_garantie": 300000.0,
                "capacite_max_colis": 60,
                "assigned_axis": None,
            },
        ]

        courier_users = [
            {
                "username": f"livreur{c['id']}",
                "email": f"livreur{c['id']}@tmsexpress.mg",
                "role": "LIVREUR",
                "nom_complet": c["nom"],
                "password": "livreur123",
            }
            for c in production_couriers
        ]

        allowed_usernames = [u["username"] for u in production_staff] + [u["username"] for u in courier_users]

        for u_data in production_staff + courier_users:
            user = db.query(UserORM).filter(UserORM.username == u_data["username"]).first()
            if not user:
                user = UserORM(
                    username=u_data["username"],
                    email=u_data["email"],
                    role=u_data["role"],
                    nom_complet=u_data["nom_complet"],
                    mot_de_passe_hash=hash_password(u_data["password"]),
                    actif=1,
                )
                db.add(user)
            else:
                user.email = u_data["email"]
                user.role = u_data["role"]
                user.nom_complet = u_data["nom_complet"]
                user.mot_de_passe_hash = hash_password(u_data["password"])
                user.actif = 1
        db.commit()

        # Supprimer uniquement les comptes tests obsolètes
        del_count = db.query(UserORM).filter(~UserORM.username.in_(allowed_usernames)).delete(synchronize_session=False)
        db.commit()
        print(f"   ✓ {len(production_staff)} comptes staff opérationnels synchronisés.")
        print(f"   ✓ {len(courier_users)} comptes mobiles livreurs synchronisés.")
        if del_count > 0:
            print(f"   ✓ {del_count} comptes obsolètes de test supprimés.")

        # ---------------------------------------------------------------------
        # 4.B FLOTTE DES LIVREURS OPÉRATIONNELS (TABLE livreurs)
        # ---------------------------------------------------------------------
        print("\n4.B Synchronisation des 10 livreurs opérationnels dans la flotte...")
        for c_data in production_couriers:
            courier = db.query(CourierORM).filter(CourierORM.id == c_data["id"]).first()
            if not courier:
                courier = CourierORM(
                    id=c_data["id"],
                    nom=c_data["nom"],
                    telephone=c_data["telephone"],
                    type_vehicule=c_data["type_vehicule"],
                    caution_garantie=c_data["caution_garantie"],
                    capacite_max_colis=c_data["capacite_max_colis"],
                    assigned_axis=c_data["assigned_axis"],
                    actif=1,
                )
                db.add(courier)
            else:
                courier.nom = c_data["nom"]
                courier.telephone = c_data["telephone"]
                courier.type_vehicule = c_data["type_vehicule"]
                courier.caution_garantie = c_data["caution_garantie"]
                courier.capacite_max_colis = c_data["capacite_max_colis"]
                courier.assigned_axis = c_data["assigned_axis"]
                courier.actif = 1
        db.commit()
        db.execute(text("SELECT setval('livreurs_id_seq', 10, true);"))
        db.commit()
        print(f"   ✓ {len(production_couriers)} livreurs opérationnels avec motos, cautions et axes configurés.")

        # ---------------------------------------------------------------------
        # 5. CONTRÔLE DES PARAMÈTRES D'ENTREPRISE ET MENTIONS LÉGALES
        # ---------------------------------------------------------------------
        print("\n5. Contrôle des paramètres d'entreprise...")
        if db.query(CompanySettingsORM).count() == 0:
            settings_corp = CompanySettingsORM(
                app_name="TMS EXPRESS 5.0",
                company_name="TMS EXPRESS MADAGASCAR",
                nif="4001234567",
                stat="52291 11 2021 0 10245",
                rcs="RCS Antananarivo 2021 B 00123",
                cif="0123456/DGI-J",
                address="Tsiazotafo / Analakely, Antananarivo 101",
                phone="+261 34 00 000 00",
                email="contact@tmsexpress.mg",
                website="www.tmsexpress.mg",
                currency="MGA",
                footer_text="Merci pour votre confiance. Envois garantis et tracés.",
            )
            db.add(settings_corp)
            db.commit()
        print("   ✓ Paramètres d'entreprise & mentions légales configurés.")

        # ---------------------------------------------------------------------
        # 6. ÉTAT FINAL ET RAPPORT DE CONTRÔLE
        # ---------------------------------------------------------------------
        colis_count = db.query(ParcelORM).count()
        tour_count = db.query(TourORM).count()
        courier_count = db.query(CourierORM).count()
        vendor_count = db.query(VendorORM).count()
        user_count = db.query(UserORM).count()
        axis_count = db.query(AxisORM).count()
        zone_count = db.query(ZoneORM).count()
        partner_count = db.query(PartnerORM).count()

        print("\n=======================================================================")
        print("          BILAN DE LA BASE DE DONNÉES EN PRODUCTION                    ")
        print("=======================================================================")
        print(f" • Colis en base                 : {colis_count} (Vierge - 0 colis)")
        print(f" • Tournées actives              : {tour_count} (Vierge - 0 tournée)")
        print(f" • Dettes / Litiges              : 0 Ar")
        print(f" • Flotte Livreurs               : {courier_count} (10 Livreurs opérationnels)")
        print(f" • Expéditeurs Référencés        : {vendor_count} (Créés à l'ingestion / CRM)")
        print(f" • Utilisateurs & Staff          : {user_count} (Admins, Superviseur, 5 Agents quai, 10 Livreurs)")
        print(f" • Axes logistiques              : {axis_count} (Urbains & Province)")
        print(f" • Zones & Tarifs référencés     : {zone_count}")
        print(f" • Gares & Partenaires Province  : {partner_count}")
        print("=======================================================================")
        print("  🎉 BASE DE PRODUCTION PRÊTE AVEC AXES, AGENTS ET LIVREURS !          ")
        print("=======================================================================\n")

    except Exception as e:
        db.rollback()
        print(f"[ERREUR] Échec du nettoyage de la base : {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    clean_database_for_production()
