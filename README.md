# 🚚 TMS EXPRESS 5.0 — Guide d'Installation & Déploiement

Système de Gestion du Transport et de la Logistique du Dernier Kilomètre (Urbain Grand Tanà & Expéditions Province Madagascar).

---

## 📋 Table des Matières

1. [Architecture & Stack Technique](#-architecture--stack-technique)
2. [Prérequis Système](#-prérequis-système)
3. [🚀 Lancement Rapide en 1 Clic (Windows)](#-lancement-rapide-en-1-clic-windows)
4. [Arborescence du Projet](#-arborescence-du-projet)
5. [Étape 1 : Configuration de la Base de Données PostgreSQL](#-étape-1--configuration-de-la-base-de-données-postgresql)
6. [Étape 2 : Installation & Lancement du Backend (FastAPI)](#-étape-2--installation--lancement-du-backend-fastapi)
7. [Étape 3 : Installation & Lancement du Frontend (Next.js)](#-étape-3--installation--lancement-du-frontend-nextjs)
8. [🔑 Identifiants & Comptes de Démonstration](#-identifiants--comptes-de-démonstration)
9. [🌐 Points d'Accès & Documentation API](#-points-daccès--documentation-api)
10. [🧪 Exécution des Suites de Tests](#-exécution-des-suites-de-tests)
11. [🛠️ Commandes Utiles & Résolution de Problèmes](#-commandes-utiles--résolution-de-problèmes)

---

## 🏗️ Architecture & Stack Technique

- **Backend** :
  - Python 3.10+ (testé et certifié sur Python 3.11 à 3.14)
  - [FastAPI](https://fastapi.tiangolo.com/) (API REST asynchrone ultra-rapide)
  - [Strawberry GraphQL](https://strawberry.rocks/) (API GraphQL typée)
  - [SQLAlchemy 2.0](https://www.sqlalchemy.org/) & [Psycopg 3](https://www.psycopg.org/psycopg3/) (ORM & driver PostgreSQL)
  - [Pydantic v2](https://docs.pydantic.dev/) (Validation stricte des DTOs)
  - [Pytest](https://docs.pytest.org/) (81 tests unitaires & d'intégration)

- **Frontend** :
  - [Next.js 14](https://nextjs.org/) (App Router, Server Components & Client Hooks)
  - [React 18](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
  - [Tailwind CSS](https://tailwindcss.com/) (Interface responsive, moderne et ergonomique)
  - [Lucide Icons](https://lucide.dev/)
  - [Cypress](https://www.cypress.io/) (14 suites complètes de tests E2E)

- **Base de Données** :
  - [PostgreSQL 14+](https://www.postgresql.org/)

---

## 💻 Prérequis Système

Assurez-vous que les outils suivants sont installés sur votre machine :

| Outil | Version Minimale | Vérification |
| :--- | :--- | :--- |
| **Python** | 3.10 ou supérieur | `python --version` |
| **Node.js** | 18.17 ou supérieur (LTS recommandé) | `node --version` |
| **npm** | 9.0 ou supérieur | `npm --version` |
| **PostgreSQL** | 14 ou supérieur | `psql --version` |
| **Git** | 2.30 ou supérieur | `git --version` |

---

## 🚀 Lancement Rapide en 1 Clic (Windows)

Un script batch automatisé est fourni à la racine pour démarrer la plateforme complète et ouvrir le navigateur dès que les services sont opérationnels :

1. **Démarrer les serveurs et ouvrir le navigateur** :
   Double-cliquez sur :
   ```cmd
   start.bat
   ```
   Ce script :
   - Vérifie la présence du backend et des dépendances frontend.
   - Lance le backend FastAPI (port 8000) et le frontend Next.js (port 3000) dans deux fenêtres distinctes.
   - Attend la disponibilité effective des deux serveurs.
   - Ouvre automatiquement **`http://localhost:3000`** dans votre navigateur par défaut.

2. **Arrêter tous les serveurs proprement** :
   Double-cliquez sur :
   ```cmd
   stop.bat
   ```
   Ce script libère instantanément les ports 8000 et 3000.

---

## 📁 Arborescence du Projet

```text
TMS'B/
├── backend/                        # Serveur d'API Python FastAPI & GraphQL
│   ├── app/
│   │   ├── application/            # Cas d'utilisation & DTOs
│   │   ├── core/                   # Configuration & Sécurité
│   │   ├── domain/                 # Entités métier & Règles de gestion
│   │   ├── infrastructure/         # Modèles SQLAlchemy, Repositories & Seeders
│   │   └── interfaces/             # Routes REST & Schémas GraphQL
│   ├── tests/                      # Tests unitaires & intégration (Pytest)
│   └── requirements.txt            # Dépendances Python verrouillées
├── frontend/                       # Application Web Next.js 14
│   ├── cypress/                    # Tests E2E Cypress
│   ├── src/
│   │   ├── app/                    # Pages & Routes applicatives (12 modules)
│   │   ├── components/             # Composants d'interface (Badges, Modales, Tickets)
│   │   └── lib/                    # Client API & Helpers
│   └── package.json                # Dépendances et scripts Node.js
├── cdc.md                          # Cahier des Charges fonctionnel & technique
└── README.md                       # Guide d'installation et d'utilisation
```

---

## 🗄️ Étape 1 : Configuration de la Base de Données PostgreSQL

1. Démarrez votre service PostgreSQL local (ou via Docker).
2. Connectez-vous à la console PostgreSQL :
   ```bash
   psql -U postgres
   ```
3. Créez la base de données dédiée :
   ```sql
   CREATE DATABASE tms_express_db;
   ```
4. *(Optionnel)* Créez un utilisateur dédié ou vérifiez vos accès :
   ```sql
   -- Exemple avec l'utilisateur postgres standard
   ALTER USER postgres WITH PASSWORD 'postgres';
   \q
   ```

---

## 🐍 Étape 2 : Installation & Lancement du Backend (FastAPI)

### 1. Accédez au répertoire `backend`
```bash
cd backend
```

### 2. Créez et activez l'environnement virtuel Python
- **Sous Windows (PowerShell)** :
  ```powershell
  python -m venv .venv
  .\.venv\Scripts\Activate.ps1
  ```
- **Sous Windows (CMD)** :
  ```cmd
  python -m venv .venv
  .\.venv\Scripts\activate.bat
  ```
- **Sous Linux / macOS** :
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

### 3. Installez les dépendances Python
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Configurez les variables d'environnement
Créez un fichier `.env` dans le dossier `backend` (ou définissez les variables système) :
```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/tms_express_db
SECRET_KEY=votre-cle-secrete-production-tms-express-2026
TIMEZONE=Indian/Antananarivo
CURRENCY=MGA
```
> **Note :** Si votre utilisateur PostgreSQL local n'a pas de mot de passe, utilisez `postgresql+psycopg://postgres@localhost:5432/tms_express_db`.

### 5. Initialisez les tables et chargez les données de référence (Seed)
Depuis la racine du projet ou depuis le dossier `backend` :
- **Sous Windows (PowerShell)** :
  ```powershell
  $env:PYTHONPATH="."
  python backend/app/infrastructure/database/seed.py
  ```
- **Sous Linux / macOS** :
  ```bash
  PYTHONPATH=. python backend/app/infrastructure/database/seed.py
  ```

Ce script initialise automatiquement :
- Les tables relationnelles PostgreSQL (colis, tournées, livreurs, caisse, litiges, reversements).
- Les 9 axes logistiques réels de Madagascar (7 corridors urbains + Axe Province).
- Les gares routières et coopératives régionales partenaires.
- La flotte de livreurs mutualisée (plafonnée à 30 colis max anti-surcharge).
- Les comptes utilisateurs par défaut avec rôles RBAC.

### 6. Lancez le serveur FastAPI
- **Mode Développement (avec rechargement à chaud)** :
  ```powershell
  $env:PYTHONPATH="."
  uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
  ```
Le backend sera immédiatement accessible sur `http://localhost:8000`.

---

## ⚛️ Étape 3 : Installation & Lancement du Frontend (Next.js)

### 1. Ouvrez un nouveau terminal et accédez au dossier `frontend`
```bash
cd frontend
```

### 2. Installez les dépendances Node.js
```bash
npm install
```

### 3. Configurez l'environnement client *(Optionnel)*
Un fichier `.env.local` peut être créé si l'URL de votre backend diffère du port par défaut :
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### 4. Lancez le serveur de développement
```bash
npm run dev
```
L'application web est accessible dans votre navigateur sur : **`http://localhost:3000`**.

### 5. Compilation et Démarrage en Mode Production
Pour tester ou déployer en mode optimisé de production :
```bash
npm run build
npm start
```

---

## 🔑 Identifiants & Comptes de Démonstration

Le système applique un contrôle d'accès strict basé sur les rôles (**RBAC**). Des comptes avec différents niveaux de privilèges sont pré-configurés :

| Rôle Métier | Nom Utilisateur | Mot de Passe | Périmètre & Habilitations |
| :--- | :--- | :--- | :--- |
| **Super Admin (Direction)** | `admin` | `admin123` | **Accès total** : Gouvernance contractuelle livreurs, validation des cautions financières, réassignation des colis en cours, gestion des comptes. |
| **Superviseur (Chef de Quai)** | `superviseur` | `super123` | **Opérationnel** : Dispatching urbain et province, ajustement quotidien de la capacité livreur (max 30), suivi des tournées et feuilles de route. |
| **Réceptionniste (Accueil)** | `reception` | `recep123` | **Inbound** : Enregistrement des colis, tarification automatique selon les zones, rattachement des nouveaux quartiers. |

---

## 🌐 Points d'Accès & Documentation API

Une fois les serveurs backend et frontend démarrés :

- **Interface Web Utilisateur** : [http://localhost:3000](http://localhost:3000)
  - `http://localhost:3000/inbound` : Réception & Enregistrement Colis (Écran 01)
  - `http://localhost:3000/dispatch` : Dispatching Urbain Grand Tanà (Écran 03A)
  - `http://localhost:3000/dispatch/province` : Expéditions Régionales & Gares (Écran 03B)
  - `http://localhost:3000/couriers` : Gestion de la Flotte & Livreurs (Écran 04)
  - `http://localhost:3000/cash` : Clôture de Caisse & Rapprochement COD (Écran 05)
  - `http://localhost:3000/disputes` : Litiges & Remboursements (Écran 06)
  - `http://localhost:3000/tracking` : Suivi Public des Colis & Timeline
- **Documentation API Interactive (Swagger / OpenAPI)** : [http://localhost:8000/docs](http://localhost:8000/docs)
- **Documentation ReDoc** : [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Strawberry GraphQL IDE** : [http://localhost:8000/graphql](http://localhost:8000/graphql)
- **Vérification de Santé (Healthcheck)** : [http://localhost:8000/health](http://localhost:8000/health)

---

## 🧪 Exécution des Suites de Tests

### 1. Tests Backend (Pytest)
Pour exécuter l'ensemble des 81 tests unitaires et d'intégration :
```powershell
$env:PYTHONPATH="."
pytest backend/tests/ -v
```

### 2. Tests Frontend E2E (Cypress)
Le frontend intègre 14 suites complètes couvrant l'ensemble du cycle de vie logistique.
- **Mode Interactif avec Interface Graphique** :
  ```bash
  cd frontend
  npm run cy:open
  ```
- **Mode Headless (Automatisé en Ligne de Commande)** :
  ```bash
  cd frontend
  npm run cy:run
  ```
- **Exécuter une spécification ciblée (exemple: dispatch & anti-surcharge)** :
  ```bash
  npx cypress run --spec "cypress/e2e/dispatch_separation_and_capacity_spec.cy.ts"
  ```

---

## 🛠️ Commandes Utiles & Résolution de Problèmes

### Erreur `ModuleNotFoundError: No module named 'backend'`
N'oubliez pas d'exporter la variable d'environnement `PYTHONPATH` pointant sur la racine du projet :
- PowerShell : `$env:PYTHONPATH="."`
- Bash/Zsh : `export PYTHONPATH=.`

### Réinitialiser la Base de Données
Pour purger et re-générer les données d'essai de manière saine :
```powershell
$env:PYTHONPATH="."
python backend/app/infrastructure/database/cleanup_province_data.py
python backend/app/infrastructure/database/seed.py
```

### Port Déjà Utilisé (8000 ou 3000)
- Sous Windows, pour trouver le processus occupant le port :
  ```powershell
  Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 3000, 8000 }
  ```
- Vous pouvez changer le port de lancement :
  - Backend : `uvicorn backend.app.main:app --port 8001`
  - Frontend : `npm run dev -- -p 3001` (et ajuster `NEXT_PUBLIC_API_URL`).

---

**TMS EXPRESS** — *Plateforme logistique urbaine & régionale conçue pour la performance opérationnelle et la sécurité routière à Madagascar.*
