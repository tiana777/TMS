@echo off
setlocal EnableExtensions
chcp 65001 >nul
title TMS EXPRESS 5.0 - Statut des Services

cd /d "%~dp0"

echo =======================================================================
echo          TMS EXPRESS 5.0 - STATUT DES SERVICES
echo =======================================================================
echo.

:: 1. PostgreSQL (Port 5432)
netstat -ano | findstr /R /C:":5432 .*LISTENING" >nul 2>&1
if not errorlevel 1 goto pg_ok
echo   [ARRETE]    PostgreSQL DB     [Port: 5432 - inactif]
goto check_backend

:pg_ok
echo   [EN LIGNE]  PostgreSQL DB     [Port: 5432]

:check_backend
:: 2. Backend FastAPI (Port 8000)
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if not errorlevel 1 goto backend_ok
echo   [ARRETE]    Backend FastAPI   [Port: 8000 - inactif]
goto check_frontend

:backend_ok
set "SEEN_8000="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":8000 .*LISTENING"') do (
    if not defined SEEN_8000 (
        echo   [EN LIGNE]  Backend FastAPI   [Port: 8000 - PID: %%a]
        set "SEEN_8000=1"
    )
)

:check_frontend
:: 3. Frontend Next.js (Port 3000)
netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul 2>&1
if not errorlevel 1 goto frontend_ok
echo   [ARRETE]    Frontend Next.js  [Port: 3000 - inactif]
goto fin

:frontend_ok
set "SEEN_3000="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":3000 .*LISTENING"') do (
    if not defined SEEN_3000 (
        echo   [EN LIGNE]  Frontend Next.js  [Port: 3000 - PID: %%a]
        set "SEEN_3000=1"
    )
)

:fin
echo.
echo =======================================================================
echo.
pause
