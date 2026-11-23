@echo off
setlocal EnableExtensions
chcp 65001 >nul
title TMS EXPRESS 5.0 - Installation Serveur

cd /d "%~dp0"

echo =======================================================================
echo          TMS EXPRESS 5.0 - INSTALLATEUR SERVEUR DE PRODUCTION
echo =======================================================================
echo.

:: 1. Verification des privileges Administrateur
net session >nul 2>&1
if errorlevel 1 goto pas_admin
echo [OK] Execution avec privileges Administrateur.
goto verif_python

:pas_admin
echo [INFO] Conseil : Pour ouvrir les ports pare-feu 3000 et 8000,
echo        vous pouvez lancer ce script en "Executer en tant qu'administrateur".
echo.

:verif_python
:: 2. Detection de Python
set "PY_CMD="
python --version >nul 2>&1
if not errorlevel 1 (
    set "PY_CMD=python"
    goto python_trouve
)

py -3 --version >nul 2>&1
if not errorlevel 1 (
    set "PY_CMD=py -3"
    goto python_trouve
)

echo [ERREUR] Python 3.10+ est introuvable sur cette machine.
echo.
echo Veuillez installer Python depuis https://www.python.org/
echo OU ouvrez un terminal et tapez : winget install Python.Python.3.11
echo.
echo IMPORTANT : Cochez impérativement la case "Add Python to PATH".
echo.
pause
exit /b 1

:python_trouve
for /f "tokens=*" %%v in ('%PY_CMD% --version 2^>^&1') do echo [OK] %%v detecte via %PY_CMD%.

:: 3. Detection de Node.js et npm
node --version >nul 2>&1
if errorlevel 1 goto node_manquant
call npm --version >nul 2>&1
if errorlevel 1 goto node_manquant

for /f "tokens=*" %%v in ('node --version 2^>^&1') do set "NODE_VER=%%v"
for /f "tokens=*" %%v in ('call npm --version 2^>^&1') do set "NPM_VER=%%v"
echo [OK] Node.js %NODE_VER% et npm %NPM_VER% detectes.
goto verif_postgres

:node_manquant
echo [ERREUR] Node.js ou npm est introuvable.
echo Veuillez installer Node.js v18+ depuis https://nodejs.org/
echo OU ouvrez un terminal et tapez : winget install OpenJS.NodeJS.LTS
echo.
pause
exit /b 1

:verif_postgres
:: 4. Verification de PostgreSQL sur le port 5432
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$t = Test-NetConnection -ComputerName 127.0.0.1 -Port 5432 -WarningAction SilentlyContinue; if ($t.TcpTestSucceeded) { exit 0 } else { exit 1 }" <nul >nul 2>&1
if not errorlevel 1 (
    echo [OK] Base de donnees PostgreSQL active sur le port 5432.
) else (
    echo [ATTENTION] PostgreSQL ne repond pas sur le port 5432.
    echo             Verifiez que le service PostgreSQL est bien demarre.
)

:menu
echo.
echo =======================================================================
echo                         MENU D'INSTALLATION
echo =======================================================================
echo.
echo   [1] Installation Automatique Express (Recommande)
echo       - Auto-detection de l'adresse IP reseau pour acces LAN
echo       - Creation de l'environnement virtuel Python (.venv)
echo       - Installation des dependances backend (pip) et frontend (npm)
echo       - Initialisation de la base PostgreSQL (Donnees de production)
echo       - Compilation Next.js de production optimisée
echo       - Configuration Pare-feu et Raccourci Bureau
echo.
echo   [2] Installation Personnalisee (Saisie manuelle IP/Domaine, Base)
echo   [3] Reparation rapide des dependances (pip install + npm install)
echo   [4] Lancer le serveur TMS EXPRESS maintenant (start.bat)
echo   [5] Quitter
echo.
set "CHOIX="
set /p "CHOIX=Entrez votre choix [1-5] (defaut: 1) : "

if "%CHOIX%"=="" set "CHOIX=1"
if "%CHOIX%"=="5" goto fin_script
if "%CHOIX%"=="4" goto lancer_serveur
if "%CHOIX%"=="3" goto reparer
if "%CHOIX%"=="2" goto install_personnalisee
if "%CHOIX%"=="1" goto install_auto

:install_auto
echo.
echo [INFO] Demarrage de l'installation automatique Express...
%PY_CMD% setup_server.py --auto
goto fin_install

:install_personnalisee
echo.
echo [INFO] Demarrage de l'installation personnalisee...
%PY_CMD% setup_server.py
goto fin_install

:reparer
echo.
echo [INFO] Reparation rapide des dependances...
%PY_CMD% setup_server.py --auto --skip-db --skip-build
goto fin_install

:fin_install
if errorlevel 1 goto erreur_install

echo.
echo =======================================================================
echo   SUCCES : L'INSTALLATION EST TERMINEE AVEC SUCCES !
echo =======================================================================
echo.
set "DEMARRER="
set /p "DEMARRER=Voulez-vous demarrer le serveur TMS EXPRESS maintenant ? [O/N] (defaut: O) : "
if "%DEMARRER%"=="" set "DEMARRER=O"
if /i "%DEMARRER%"=="o" goto lancer_serveur

echo.
echo Pour demarrer le serveur plus tard, double-cliquez sur :
echo   start.bat  ou sur le raccourci créé sur votre Bureau.
echo.
goto fin_pause

:lancer_serveur
echo.
echo [INFO] Lancement de TMS EXPRESS...
call start.bat
goto fin_script

:erreur_install
echo.
echo =======================================================================
echo   ERREUR : Une erreur s'est produite lors de l'installation.
echo   Verifiez les messages d'erreur ci-dessus.
echo =======================================================================
echo.

:fin_pause
pause

:fin_script
exit /b 0
