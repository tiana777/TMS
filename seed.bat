@echo off
setlocal EnableExtensions
chcp 65001 >nul
title TMS EXPRESS - Injection des Donnees de Test (Seed)

cd /d "%~dp0"

REM 1. Detection de l'interpreteur Python
if exist "backend\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=backend\.venv\Scripts\python.exe"
    goto check_args
)

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Python est introuvable. Veuillez installer les dependances avec install.bat
    echo.
    pause
    exit /b 1
)
set "PYTHON_EXE=python"

:check_args
REM Definition du PYTHONPATH pour la resolution des modules backend
set "PYTHONPATH=%CD%"

REM 2. Execution directe si un argument est fourni
if /i "%~1"=="all" goto seed_all
if /i "%~1"=="base" goto seed_base
if /i "%~1"=="parcels" goto seed_parcels

:menu
cls
echo =======================================================================
echo          TMS EXPRESS - INJECTION DES DONNEES DE TEST (SEED)
echo =======================================================================
echo.
echo  Choisissez l'action a executer :
echo.
echo  [1] Jeu de test complet et realiste (RECOMMANDE)
echo      - Vide les anciennes donnees operationnelles
echo      - 37 colis reels multi-flux (COD, Province, Simple, SAV, B2B)
echo      - 4 livreurs de quai, 3 profils d'expediteurs reels, tournees du jour
echo.
echo  [2] Donnees de reference de base (Master Data)
echo      - Initialise les tables, utilisateurs Hub, axes officiels et zones
echo.
echo  [3] Reinjection ciblee des colis de test
echo      - Nettoie et reinjecte uniquement les colis pour le pointage
echo.
echo  [4] Quitter
echo.
echo =======================================================================
set "CHOIX="
set /p "CHOIX=Votre choix [1, 2, 3 ou 4] (par defaut: 1) : "

if "%CHOIX%"=="" set "CHOIX=1"
if "%CHOIX%"=="1" goto seed_all
if "%CHOIX%"=="2" goto seed_base
if "%CHOIX%"=="3" goto seed_parcels
if "%CHOIX%"=="4" goto fin

echo.
echo [ATTENTION] Choix invalide. Veuillez reessayer.
ping 127.0.0.1 -n 2 >nul
goto menu

:seed_all
echo.
echo =======================================================================
echo [LANCEMENT] Injection du jeu de test complet et realiste...
echo =======================================================================
"%PYTHON_EXE%" "backend/app/infrastructure/database/reset_and_seed_real_data.py"
goto resultat

:seed_base
echo.
echo =======================================================================
echo [LANCEMENT] Injection des donnees de reference (Master Data)...
echo =======================================================================
"%PYTHON_EXE%" "backend/app/infrastructure/database/seed.py"
goto resultat

:seed_parcels
echo.
echo =======================================================================
echo [LANCEMENT] Reinjection ciblee des colis de test...
echo =======================================================================
"%PYTHON_EXE%" "backend/app/infrastructure/database/reseed_all_test_parcels.py"
goto resultat

:resultat
echo.
if %errorlevel% equ 0 (
    echo =======================================================================
    echo [SUCCES] Les donnees ont ete injectees avec succes dans la base !
    echo =======================================================================
) else (
    echo =======================================================================
    echo [ERREUR] Une erreur est survenue lors de l'execution du script.
    echo =======================================================================
)
echo.
pause
exit /b %errorlevel%

:fin
echo Sortie.
exit /b 0
