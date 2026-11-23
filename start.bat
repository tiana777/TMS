@echo off
setlocal EnableExtensions
chcp 65001 >nul
title TMS EXPRESS 5.0 - Demarrage des Serveurs

cd /d "%~dp0"

:: Augmente la memoire allouee a Node.js (4 Go) pour une stabilite maximale
set "NODE_OPTIONS=--max-old-space-size=4096"

echo =======================================================================
echo          TMS EXPRESS 5.0 - DEMARRAGE DES SERVICES
echo =======================================================================
echo.

:: 1. Verification de l'environnement virtuel Python
if not exist "backend\.venv\Scripts\python.exe" goto venv_manquant
goto verif_frontend

:venv_manquant
echo [ERREUR] L'environnement virtuel 'backend\.venv' est introuvable.
echo Veuillez lancer l'installateur d'abord :
echo   double-cliquez sur install.bat
echo.
pause
exit /b 1

:verif_frontend
:: 2. Verification des dependances frontend
if not exist "frontend\node_modules" goto npm_manquant
goto check_backend

:npm_manquant
echo [INFO] Premier lancement detecte : installation des dependances frontend...
cd /d "%~dp0\frontend"
call npm install
cd /d "%~dp0"

:check_backend
:: 3. Verification si le backend est deja actif sur le port 8000
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if not errorlevel 1 goto backend_deja_actif

echo [1/3] Lancement du Backend FastAPI sur le port 8000...
start "TMS EXPRESS - Backend" cmd /k "title TMS EXPRESS - Backend && cd /d "%~dp0" && set PYTHONPATH=. && backend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000"
goto check_frontend

:backend_deja_actif
echo [1/3] [DEJA ACTIF] Le Backend FastAPI tourne deja sur le port 8000.

:check_frontend
:: 4. Verification si le frontend est deja actif sur le port 3000
netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul 2>&1
if not errorlevel 1 goto frontend_deja_actif

:: Verification du build de production Next.js
if exist "frontend\.next\prerender-manifest.json" goto lancer_prod
echo [INFO] Build de production requis : compilation Next.js en cours...
cd /d "%~dp0\frontend"
call npm run build
cd /d "%~dp0"

:lancer_prod
echo [2/3] Lancement du Frontend Next.js (Mode Serveur Production) sur le port 3000...
start "TMS EXPRESS - Frontend" cmd /k "title TMS EXPRESS - Frontend && cd /d "%~dp0\frontend" && set "NODE_OPTIONS=--max-old-space-size=4096" && npm run start"
goto wait_servers

:frontend_deja_actif
echo [2/3] [DEJA ACTIF] Le Frontend Next.js tourne deja sur le port 3000.

:wait_servers
echo.
echo [3/3] En attente de disponibilite des services...
ping 127.0.0.1 -n 4 >nul

:: Verification des ports
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if errorlevel 1 goto retry_wait
netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul 2>&1
if errorlevel 1 goto retry_wait
goto pret

:retry_wait
ping 127.0.0.1 -n 4 >nul

:pret
echo.
echo =======================================================================
echo      TOUS LES SERVICES TMS EXPRESS SONT EN LIGNE ET PRETS !
echo =======================================================================
echo.
echo   - Application Web  : http://localhost:3000
echo   - Swagger API Docs : http://localhost:8000/docs
echo.
echo   Comptes de connexion :
echo     * Super Admin : admin / admin123
echo     * Directeur   : directeur / directeur123
echo     * Agents      : agent1 a agent5 / agent123
echo     * Livreurs    : livreur1 a livreur10 / livreur123
echo.
echo Ouverture automatique de votre navigateur sur http://localhost:3000 ...
start http://localhost:3000
echo.
echo Conseil : Pour arreter proprement les serveurs, double-cliquez sur stop.bat
echo.
pause
