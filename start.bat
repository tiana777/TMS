@echo off
chcp 65001 >nul
title TMS EXPRESS 5.0 - Démarrage des Serveurs

echo ===============================================================================
echo                   🚚 TMS EXPRESS 5.0 — LANCEUR RAPIDE
echo ===============================================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: 1. Vérification de l'environnement virtuel Python
if not exist "backend\.venv\Scripts\uvicorn.exe" (
    echo [ERREUR] L'environnement virtuel 'backend\.venv' est introuvable.
    echo.
    echo Veuillez initialiser le backend au prealable :
    echo   1. cd backend
    echo   2. python -m venv .venv
    echo   3. .\.venv\Scripts\activate
    echo   4. pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

:: 2. Vérification du fichier .env pour le backend (création par défaut si absent)
if not exist "backend\.env" (
    echo [INFO] Creation du fichier backend\.env par defaut...
    (
        echo DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/tms_express_db
        echo SECRET_KEY=super-secret-tms-express-key-2026
        echo TIMEZONE=Indian/Antananarivo
        echo CURRENCY=MGA
    ) > "backend\.env"
)

:: 3. Vérification des dépendances frontend
if not exist "frontend\node_modules" (
    echo [INFO] Premier lancement detecte : installation des dependances frontend (npm install)...
    cd /d "%ROOT_DIR%frontend"
    call npm install
    cd /d "%ROOT_DIR%"
)

:: 4. Lancement du Backend (FastAPI sur le port 8000)
echo [1/3] Lancement du Backend FastAPI sur le port 8000...
start "TMS EXPRESS - Backend (FastAPI :8000)" cmd /k "title TMS EXPRESS - Backend (Port 8000) && cd /d ""%ROOT_DIR%"" && set PYTHONPATH=. && call backend\.venv\Scripts\activate.bat && uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

:: 5. Lancement du Frontend (Next.js sur le port 3000)
echo [2/3] Lancement du Frontend Next.js sur le port 3000...
start "TMS EXPRESS - Frontend (Next.js :3000)" cmd /k "title TMS EXPRESS - Frontend (Port 3000) && cd /d ""%ROOT_DIR%frontend"" && npm run dev"

:: 6. Attente de la disponibilité des deux serveurs
echo [3/3] En attente de la disponibilite des services (Backend & Frontend)...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$maxWait=60;$elapsed=0;$bOk=$false;$fOk=$false;while((-not($bOk -and $fOk)) -and ($elapsed -lt $maxWait)){Start-Sleep -Seconds 1;$elapsed++;if(-not $bOk){try{$r=Invoke-WebRequest -Uri 'http://localhost:8000/health' -UseBasicParsing -TimeoutSec 1;if($r.StatusCode -eq 200){$bOk=$true;Write-Host '  [V] Backend FastAPI operationnel (http://localhost:8000)' -ForegroundColor Green}}catch{}};if(-not $fOk){try{$r=Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 1;if($r.StatusCode -eq 200){$fOk=$true;Write-Host '  [V] Frontend Next.js operationnel (http://localhost:3000)' -ForegroundColor Green}}catch{}};if((-not $bOk -or -not $fOk) -and ($elapsed % 5 -eq 0)){Write-Host ('  ... demarrage en cours (' + $elapsed + 's / ' + $maxWait + 's)...') -ForegroundColor Yellow}};if($bOk -and $fOk){exit 0}else{exit 1}"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ATTENTION] Les serveurs mettent plus de temps que prevu a repondre.
    echo Verifiez les deux fenetres de console ouvertes pour voir les journaux.
) else (
    echo.
    echo ===============================================================================
    echo      🎉 TOUS LES SERVICES TMS EXPRESS SONT EN LIGNE ET PRETS !
    echo ===============================================================================
)

echo.
echo   - Application Web  : http://localhost:3000
echo   - Swagger API Docs : http://localhost:8000/docs
echo   - GraphQL Explorer : http://localhost:8000/graphql
echo.
echo   Comptes de test pre-configures :
echo     * Direction    : admin       / admin123  (Super Admin)
echo     * Superviseur  : superviseur / super123  (Chef de Quai)
echo     * Reception    : reception   / recep123  (Inbound Accueil)
echo.
echo Ouverture automatique de votre navigateur sur http://localhost:3000 ...
start http://localhost:3000

echo.
echo (Vous pouvez reduire cette fenetre. Pour arreter les serveurs, fermez leurs fenetres respectives ou executez stop.bat)
echo.
pause
