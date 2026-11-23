"""Script pour initialiser exactement les comptes demandés par l'utilisateur :
- 1 Super Admin : admin / admin123
- 1 Directeur   : directeur / directeur123
- 4 Agents      : agent1, agent2, agent3, agent4 / agent123
"""

from backend.app.infrastructure.database.connection import SessionLocal
from backend.app.infrastructure.persistence.models import UserORM
from backend.app.infrastructure.security.auth import hash_password
from sqlalchemy import text

def run_migration():
    session = SessionLocal()
    try:
        # 1. Vérifier la contrainte de rôle
        try:
            session.execute(text("ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check;"))
            session.execute(text("""
                ALTER TABLE utilisateurs ADD CONSTRAINT utilisateurs_role_check 
                CHECK (role IN ('RECEPTIONNISTE', 'SUPERVISEUR', 'SUPER_ADMIN', 'LIVREUR'));
            """))
            session.commit()
            print("[OK] Contrainte utilisateurs_role_check vérifiée.")
        except Exception as e:
            session.rollback()
            print("[INFO] Contrainte de rôle :", e)

        # 2. Super Admin
        admin = session.query(UserORM).filter(UserORM.username == "admin").first()
        if not admin:
            admin = UserORM(
                username="admin",
                email="admin@tmsexpress.mg",
                role="SUPER_ADMIN",
                nom_complet="Super Administrateur",
                mot_de_passe_hash=hash_password("admin123"),
                actif=1
            )
            session.add(admin)
        else:
            admin.nom_complet = "Super Administrateur"
            admin.email = "admin@tmsexpress.mg"
            admin.role = "SUPER_ADMIN"
            admin.mot_de_passe_hash = hash_password("admin123")
            admin.actif = 1

        # 3. Directeur
        directeur = session.query(UserORM).filter(UserORM.username == "directeur").first()
        if not directeur:
            directeur = UserORM(
                username="directeur",
                email="directeur@tmsexpress.mg",
                role="SUPER_ADMIN",
                nom_complet="Directeur des Opérations",
                mot_de_passe_hash=hash_password("directeur123"),
                actif=1
            )
            session.add(directeur)
        else:
            directeur.nom_complet = "Directeur des Opérations"
            directeur.email = "directeur@tmsexpress.mg"
            directeur.role = "SUPER_ADMIN"
            directeur.mot_de_passe_hash = hash_password("directeur123")
            directeur.actif = 1

        session.commit()

        # 4. Les 4 Agents de quai
        agents_data = [
            ("agent1", "Aina Razafy", "agent1@tmsexpress.mg", "agent123", "recep_cod"),
            ("agent2", "Faly Rabe", "agent2@tmsexpress.mg", "agent123", "recep_simple"),
            ("agent3", "Hery Andrianina", "agent3@tmsexpress.mg", "agent123", "recep_province"),
            ("agent4", "Voahirana Rasoanaivo", "agent4@tmsexpress.mg", "agent123", "recep_retour"),
        ]

        agent_ids = []
        for uname, nom, mail, pwd, old_uname in agents_data:
            user = session.query(UserORM).filter((UserORM.username == uname) | (UserORM.username == old_uname)).first()
            if not user:
                user = UserORM(
                    username=uname,
                    nom_complet=nom,
                    email=mail,
                    role="RECEPTIONNISTE",
                    mot_de_passe_hash=hash_password(pwd),
                    actif=1
                )
                session.add(user)
                session.flush()
            else:
                user.username = uname
                user.nom_complet = nom
                user.email = mail
                user.role = "RECEPTIONNISTE"
                user.mot_de_passe_hash = hash_password(pwd)
                user.actif = 1
                session.flush()
            agent_ids.append(user.id)

        session.commit()

        # Réassigner les clés étrangères des anciens utilisateurs obsolètes vers agent1 ou admin
        agent1_user = session.query(UserORM).filter(UserORM.username == "agent1").first()
        admin_user = session.query(UserORM).filter(UserORM.username == "admin").first()
        valid_ids_subquery = "(SELECT id FROM utilisateurs WHERE username IN ('admin', 'directeur', 'agent1', 'agent2', 'agent3', 'agent4'))"

        session.execute(text(f"""
            UPDATE colis 
            SET receptionniste_id = {agent1_user.id}, 
                receptionniste_nom = '{agent1_user.nom_complet}' 
            WHERE receptionniste_id NOT IN {valid_ids_subquery}
               OR receptionniste_id IS NULL;
        """))

        session.execute(text(f"""
            UPDATE colis_statut_historique 
            SET utilisateur_id = {admin_user.id} 
            WHERE utilisateur_id NOT IN {valid_ids_subquery};
        """))

        session.execute(text(f"""
            UPDATE encaissements 
            SET utilisateur_id = {admin_user.id} 
            WHERE utilisateur_id NOT IN {valid_ids_subquery};
        """))

        session.execute(text(f"""
            UPDATE remboursements_dettes 
            SET utilisateur_validateur_id = {admin_user.id} 
            WHERE utilisateur_validateur_id NOT IN {valid_ids_subquery};
        """))

        session.execute(text(f"""
            UPDATE reversements_vendeurs 
            SET utilisateur_id = {admin_user.id} 
            WHERE utilisateur_id NOT IN {valid_ids_subquery};
        """))

        session.commit()

        # Supprimer les anciens comptes obsolètes (sauf les 6 comptes officiels)
        official_usernames = ("admin", "directeur", "agent1", "agent2", "agent3", "agent4")
        session.execute(text(f"""
            DELETE FROM utilisateurs 
            WHERE username NOT IN {official_usernames};
        """))
        session.commit()

        # Affichage récapitulatif
        users = session.query(UserORM).order_by(UserORM.id).all()
        print("\n=======================================================")
        print("    COMPTES UTILISATEURS CONFIGURÉS EN BASE DE DONNÉES")
        print("=======================================================")
        for u in users:
            print(f"ID: {u.id:2d} | Login: {u.username:<10} | Rôle: {u.role:<14} | Nom: {u.nom_complet:<30} | Email: {u.email}")
        print("=======================================================\n")
        print(f"Total comptes créés : {len(users)} (1 Super Admin, 1 Directeur, 4 Agents)")

    except Exception as err:
        session.rollback()
        print("[ERREUR] Échec de la configuration des comptes :", err)
        raise err
    finally:
        session.close()

if __name__ == "__main__":
    run_migration()
