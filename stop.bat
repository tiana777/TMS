@echo off
chcp 65001 >nul
title TMS EXPRESS 5.0 - Arrêt des Serveurs

echo ===============================================================================
echo                   🛑 TMS EXPRESS 5.0 — ARRET DES SERVEURS
echo ===============================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ports = @(8000, 3000); $found = $false;" ^
  "foreach ($p in $ports) {" ^
  "  $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue;" ^
  "  if ($conns) {" ^
  "    foreach ($c in $conns) {" ^
  "      $procId = $c.OwningProcess;" ^
  "      try {" ^
  "        $pName = (Get-Process -Id $procId).ProcessName;" ^
  "        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue;" ^
  "        Write-Host ('  [OK] Processus ' + $pName + ' (PID: ' + $procId + ') sur le port ' + $p + ' arrete.') -ForegroundColor Green;" ^
  "        $found = $true;" ^
  "      } catch {}" ^
  "    }" ^
  "  } else {" ^
  "    Write-Host ('  [-] Aucun processus actif sur le port ' + $p + '.') -ForegroundColor Gray;" ^
  "  }" ^
  "};" ^
  "if (-not $found) { Write-Host '  Tous les ports sont deja libres.' -ForegroundColor Cyan }"

echo.
echo ===============================================================================
echo Les serveurs TMS EXPRESS ont ete arretes.
echo ===============================================================================
echo.
pause
