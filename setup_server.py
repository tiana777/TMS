#!/usr/bin/env python3
"""Script d'installation et de déploiement automatisé pour TMS EXPRESS 5.0.

Automatise :
1. Vérification des prérequis (Python, Node, npm, PostgreSQL)
2. Détection de l'adresse IP du serveur / configuration du nom de domaine
3. Configuration de backend/.env et initialisation de la base PostgreSQL
4. Création du virtualenv Python et installation des packages requis
5. Configuration de frontend/.env.local et compilation de production (npm run build)
6. Création des répertoires de logs et configuration de PM2
7. Ouverture des ports pare-feu (Firewall)
"""

import argparse
import os
import sys
import subprocess
import socket
import secrets
import platform
import shutil
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
LOGS_DIR = ROOT_DIR / "logs"

IS_WINDOWS = platform.system().lower() == "windows"


def print_banner():
    print("""
=======================================================================
   🚀  TMS EXPRESS 5.0 — INSTALLATEUR AUTOMATISÉ POUR SERVEUR
=======================================================================
   Ce script configure l'ensemble des services pour transformer cette
   machine en serveur opérationnel (Backend FastAPI + Frontend Next.js
   + Base de Données PostgreSQL + Démarrage en arrière-plan PM2).
=======================================================================
""")


def get_local_ip():
    """Détecte l'adresse IP locale de la machine sur le réseau (LAN / Wi-Fi)."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def run_cmd(cmd, cwd=None, exit_on_fail=True, shell=True):
    """Exécute une commande shell avec affichage direct."""
    print(f"   ➔ Exécution : {cmd if isinstance(cmd, str) else ' '.join(cmd)}")
    res = subprocess.run(cmd, cwd=cwd, shell=shell)
    if res.returncode != 0 and exit_on_fail:
        print(f"\n❌ ERREUR : La commande a échoué avec le code {res.returncode}.")
        sys.exit(res.returncode)
    return res.returncode == 0


def step_1_check_prerequisites():
    print("\n[Étape 1/6] 🔍 Vérification des prérequis système...")

    # Node.js
    node_ok = shutil.which("node") is not None
    npm_ok = shutil.which("npm") is not None
    print(f"   • Node.js : {'✓ Présent' if node_ok else '❌ Manquant (Veuillez installer Node.js v18+)'}")
    print(f"   • npm     : {'✓ Présent' if npm_ok else '❌ Manquant'}")

    if not (node_ok and npm_ok):
        print("\n❌ Node.js et npm sont obligatoires pour faire tourner le Frontend.")
        print("   Téléchargez et installez Node.js depuis : https://nodejs.org/")
        sys.exit(1)

    # Python
    py_ver = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    print(f"   • Python  : ✓ Présent (Version {py_ver})")
    if sys.version_info < (3, 10):
        print("⚠️ Attention : Python 3.10+ est recommandé.")

    # Dossier logs
    LOGS_DIR.mkdir(exist_ok=True)
    print("   • Dossier logs/ : ✓ Prêt")


def step_2_configure_network_and_env(args):
    print("\n[Étape 2/6] 🌐 Configuration Réseau & Adresses d'accès...")
    detected_ip = get_local_ip()
    print(f"   • Adresse IP locale détectée sur cette machine : {detected_ip}")

    if args.host:
        server_host = args.host.strip()
    elif args.auto:
        server_host = detected_ip
        print(f"   • Mode automatique activé : Utilisation de l'IP {server_host}")
    else:
        try:
            server_host = input(
                f"   Entrez l'adresse IP ou le nom de domaine de ce serveur [{detected_ip}] : "
            ).strip()
        except (EOFError, KeyboardInterrupt):
            server_host = detected_ip
        if not server_host:
            server_host = detected_ip

    print(f"   ✓ Les clients se connecteront à l'API sur : http://{server_host}:8000/api/v1")
    print(f"   ✓ L'interface Web sera accessible sur     : http://{server_host}:3000")

    # Configuration DB
    default_db_url = "postgresql+psycopg://postgres:postgres@localhost:5432/tms_express_db"
    if args.db_url:
        database_url = args.db_url.strip()
    elif args.auto:
        database_url = default_db_url
        print(f"   • Mode automatique : Base de données par défaut ({database_url})")
    else:
        print("\n   Configuration de la base de données PostgreSQL :")
        try:
            db_input = input(
                f"   DATABASE_URL [{default_db_url}] : "
            ).strip()
        except (EOFError, KeyboardInterrupt):
            db_input = default_db_url
        database_url = db_input if db_input else default_db_url

    # Écriture backend/.env
    backend_env_path = BACKEND_DIR / ".env"
    secret_key = secrets.token_urlsafe(32)
    backend_env_content = f"""# Configuration Production Générée Automatiquement
DATABASE_URL={database_url}
SECRET_KEY={secret_key}
ENVIRONMENT=production
"""
    with open(backend_env_path, "w", encoding="utf-8") as f:
        f.write(backend_env_content)
    print(f"   ✓ Fichier {backend_env_path} créé avec succès.")

    # Écriture frontend/.env.local
    frontend_env_path = FRONTEND_DIR / ".env.local"
    frontend_env_content = f"""# Configuration Production Générée Automatiquement
NEXT_PUBLIC_API_URL="http://{server_host}:8000/api/v1"

# Identifiants de l'Entreprise et de l'Application
NEXT_PUBLIC_APP_NAME="VIT MAD"
NEXT_PUBLIC_COMPANY_NAME="VIT MAD LOGISTICS"
NEXT_PUBLIC_COMPANY_NIF="4001234567"
NEXT_PUBLIC_COMPANY_STAT="52291 11 2021 0 10245"
NEXT_PUBLIC_COMPANY_RCS="RCS Antananarivo 2021 B 00123"
NEXT_PUBLIC_COMPANY_CIF="0123456/DGI-J"
NEXT_PUBLIC_COMPANY_ADDRESS="Tsiazotafo / Analakely, Antananarivo 101"
NEXT_PUBLIC_COMPANY_PHONE="+261 34 00 000 00"
NEXT_PUBLIC_COMPANY_EMAIL="contact@vitmad.mg"
NEXT_PUBLIC_CURRENCY="MGA"
"""
    with open(frontend_env_path, "w", encoding="utf-8") as f:
        f.write(frontend_env_content)
    print(f"   ✓ Fichier {frontend_env_path} créé avec succès.")

    return server_host, database_url


def step_3_setup_backend_venv():
    print("\n[Étape 3/6] 🐍 Installation de l'environnement Python & Dépendances Backend...")

    venv_dir = BACKEND_DIR / ".venv"
    if not venv_dir.exists():
        print("   • Création du virtualenv...")
        run_cmd(f'"{sys.executable}" -m venv "{venv_dir}"')
    else:
        print("   • Virtualenv déjà présent.")

    pip_exe = venv_dir / ("Scripts/pip.exe" if IS_WINDOWS else "bin/pip")
    py_exe = venv_dir / ("Scripts/python.exe" if IS_WINDOWS else "bin/python")

    print("   • Mise à jour de pip et installation des packages...")
    run_cmd(f'"{py_exe}" -m pip install --upgrade pip', exit_on_fail=False)
    req_file = BACKEND_DIR / "requirements.txt"
    run_cmd(f'"{py_exe}" -m pip install -r "{req_file}"')
    print("   ✓ Dépendances Python installées.")

    return py_exe


def step_4_init_database(py_exe, args, database_url=None):
    if args.skip_db:
        print("\n[Étape 4/6] ⏭️ Saut de l'initialisation de la base (--skip-db demandé).")
        return
    print("\n[Étape 4/6] 🗄️ Initialisation et amorçage de la base de données PostgreSQL...")
    clean_script = "backend.app.infrastructure.database.clean_for_production"
    
    current_url = database_url or "postgresql+psycopg://postgres:postgres@localhost:5432/tms_express_db"

    while True:
        env_copy = os.environ.copy()
        env_copy["PYTHONPATH"] = str(ROOT_DIR)
        env_copy["DATABASE_URL"] = current_url

        res = subprocess.run(
            f'"{py_exe}" -m {clean_script}',
            cwd=str(ROOT_DIR),
            shell=True,
            env=env_copy,
        )
        if res.returncode == 0:
            print("   ✓ Base de données initialisée avec succès.")
            break
        else:
            print("\n   ⚠️ Échec de connexion à PostgreSQL.")
            print(f"      URL testée : {current_url}")
            print("      Causes possibles : mot de passe postgres requis, ou service PostgreSQL arrêté.")
            try:
                prompt_text = "   Entrez le mot de passe de l'utilisateur 'postgres' (ou Entrée pour ignorer) : "
                pwd_input = input(prompt_text).strip()
                if not pwd_input:
                    break
                current_url = f"postgresql+psycopg://postgres:{pwd_input}@localhost:5432/tms_express_db"
                # Mettre à jour backend/.env
                backend_env_path = BACKEND_DIR / ".env"
                if backend_env_path.exists():
                    with open(backend_env_path, "r", encoding="utf-8") as f:
                        lines = f.readlines()
                    with open(backend_env_path, "w", encoding="utf-8") as f:
                        for l in lines:
                            if l.startswith("DATABASE_URL="):
                                f.write(f"DATABASE_URL={current_url}\n")
                            else:
                                f.write(l)
                print(f"   • Re-tentative avec le mot de passe renseigné...")
            except (EOFError, KeyboardInterrupt):
                break


def step_5_build_frontend(args):
    if args.skip_build:
        print("\n[Étape 5/6] ⏭️ Saut du build frontend (--skip-build demandé).")
        return
    print("\n[Étape 5/6] ⚛️ Installation et Compilation de Production du Frontend (Next.js)...")
    print("   • Installation des packages npm (npm install)...")
    run_cmd("npm install", cwd=str(FRONTEND_DIR))

    print("   • Compilation de production optimisée (npm run build)...")
    run_cmd("npm run build", cwd=str(FRONTEND_DIR))
    print("   ✓ Build de production Next.js généré avec succès.")


def step_6_setup_pm2(server_host):
    print("\n[Étape 6/6] ⚙️ Configuration du gestionnaire de démarrage en arrière-plan (PM2)...")

    # Mettre à jour ecosystem.config.js avec des chemins propres
    ecosystem_path = ROOT_DIR / "ecosystem.config.js"
    ecosystem_content = """const path = require("path");
const isWin = process.platform === "win32";

const pythonExec = isWin
  ? path.join(__dirname, "backend", ".venv", "Scripts", "python.exe")
  : path.join(__dirname, "backend", ".venv", "bin", "python");

module.exports = {
  apps: [
    {
      name: "tms-backend",
      script: pythonExec,
      args: "-m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000",
      cwd: __dirname,
      autorestart: true,
      max_restarts: 10,
      env: {
        PYTHONPATH: ".",
      },
      error_file: "./logs/backend_err.log",
      out_file: "./logs/backend.log",
    },
    {
      name: "tms-frontend",
      script: "npm",
      args: "start -- -p 3000",
      cwd: path.join(__dirname, "frontend"),
      autorestart: true,
      max_restarts: 10,
      error_file: "./logs/frontend_err.log",
      out_file: "./logs/frontend.log",
    },
  ],
};
"""
    with open(ecosystem_path, "w", encoding="utf-8") as f:
        f.write(ecosystem_content)
    print("   ✓ Fichier ecosystem.config.js mis à jour pour la production.")

    # Vérifier si PM2 est installé
    pm2_ok = shutil.which("pm2") is not None
    if not pm2_ok:
        print("   • Installation globale de PM2 via npm...")
        run_cmd("npm install -g pm2", exit_on_fail=False)
        pm2_ok = shutil.which("pm2") is not None

    if pm2_ok:
        print("   • Lancement des processus sous PM2...")
        run_cmd("pm2 delete all", exit_on_fail=False)
        run_cmd(f'pm2 start "{ecosystem_path}"', exit_on_fail=False)
        run_cmd("pm2 save", exit_on_fail=False)
        print("   ✓ Services démarrés sous PM2.")
    else:
        print("   ℹ️ PM2 n'est pas encore installé globalement.")
        print("      Vous pouvez le lancer manuellement avec : npm install -g pm2 && pm2 start ecosystem.config.js")

    # Pare-feu Windows automatique
    if IS_WINDOWS:
        try:
            print("   • Ajout des règles de pare-feu Windows pour les ports 3000 et 8000...")
            run_cmd('netsh advfirewall firewall add rule name="TMS_Frontend_3000" dir=in action=allow protocol=TCP localport=3000', exit_on_fail=False)
            run_cmd('netsh advfirewall firewall add rule name="TMS_Backend_8000" dir=in action=allow protocol=TCP localport=8000', exit_on_fail=False)
            print("   ✓ Règles pare-feu configurées.")
        except Exception:
            pass


def create_desktop_shortcut():
    """Crée un raccourci de démarrage sur le bureau Windows si possible."""
    if not IS_WINDOWS:
        return
    try:
        desktop = Path(os.environ.get("USERPROFILE", "")) / "Desktop"
        if not desktop.exists():
            desktop = Path(os.environ.get("USERPROFILE", "")) / "Bureau"
        if desktop.exists():
            vbs_script = desktop / "Demarrer TMS EXPRESS.bat"
            with open(vbs_script, "w", encoding="utf-8") as f:
                f.write(f'@echo off\ncd /d "{ROOT_DIR}"\ncall start.bat\n')
            print(f"   ✓ Raccourci créé sur votre Bureau : {vbs_script}")
    except Exception:
        pass


def print_completion(server_host):
    print(f"""
=======================================================================
   🎉  INSTALLATION DU SERVEUR TERMINÉE AVEC SUCCÈS !
=======================================================================

   L'application est prête et accessible depuis n'importe quel ordinateur,
   tablette ou smartphone connecté au réseau :

   👉 Interface Utilisateur (Web) :  http://{server_host}:3000
   👉 Documentation API Backend   :  http://{server_host}:8000/docs

   Comptes initiaux créés :
   -------------------------------------------------------------------
   • Super Admin   : admin / admin123  (ou directeur / directeur123)
   • Superviseur   : superviseur / super123
   • Quai (Agents) : agent1 / agent123

   Commandes utiles pour administrer :
   -------------------------------------------------------------------
   • Démarrer manuellement : start.bat
   • Arrêter               : stop.bat
   • Vérifier l'état (PM2) : pm2 status
   • Voir les logs         : pm2 logs
=======================================================================
""")


def main():
    parser = argparse.ArgumentParser(description="Installateur Serveur TMS EXPRESS 5.0")
    parser.add_argument("--auto", "-y", action="store_true", help="Mode automatique sans saisie manuelle")
    parser.add_argument("--host", type=str, default="", help="Adresse IP ou nom de domaine du serveur")
    parser.add_argument("--db-url", type=str, default="", help="URL de la base de données PostgreSQL")
    parser.add_argument("--skip-build", action="store_true", help="Sauter la compilation Next.js")
    parser.add_argument("--skip-db", action="store_true", help="Sauter l'initialisation de la base PostgreSQL")
    args = parser.parse_args()

    print_banner()
    step_1_check_prerequisites()
    server_host, database_url = step_2_configure_network_and_env(args)
    py_exe = step_3_setup_backend_venv()
    step_4_init_database(py_exe, args, database_url=database_url)
    step_5_build_frontend(args)
    step_6_setup_pm2(server_host)
    create_desktop_shortcut()
    print_completion(server_host)


if __name__ == "__main__":
    main()

