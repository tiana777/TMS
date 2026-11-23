@echo off
setlocal EnableExtensions
chcp 65001 >nul
title TMS EXPRESS 5.0 - Arret des Serveurs

cd /d "%~dp0"

echo =======================================================================
echo          TMS EXPRESS 5.0 - ARRET COMPLET DES SERVEURS
echo =======================================================================
echo.

:: 1. Arret PM2 si present
where pm2 >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Arret des processus PM2 eventuels...
    call pm2 stop all >nul 2>&1
    call pm2 delete all >nul 2>&1
)

:: 2. Tuer les processus sur le port 8000 [Backend]
set "FOUND=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":8000 .*LISTENING"') do (
    echo [OK] Arret du processus Backend [PID: %%a]...
    taskkill /F /T /PID %%a >nul 2>&1
    set "FOUND=1"
)

:: 3. Tuer les processus sur le port 3000 [Frontend]
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":3000 .*LISTENING"') do (
    echo [OK] Arret du processus Frontend [PID: %%a]...
    taskkill /F /T /PID %%a >nul 2>&1
    set "FOUND=1"
)

:: 4. Fermer les fenetres cmd portant le titre TMS EXPRESS
taskkill /F /FI "WINDOWTITLE eq TMS EXPRESS - Backend*" /IM cmd.exe >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq TMS EXPRESS - Frontend*" /IM cmd.exe >nul 2>&1

echo.
if "%FOUND%"=="1" goto arrete_ok
goto deja_libre

:arrete_ok
echo =======================================================================
echo   TOUS LES PROCESSUS TMS EXPRESS ONT ETE ARRETES AVEC SUCCES.
echo =======================================================================
goto fin

:deja_libre
echo =======================================================================
echo   AUCUN PROCESSUS ACTIF N'A ETE TROUVE SUR LES PORTS 8000 ET 3000.
echo =======================================================================

:fin
echo.
pause
