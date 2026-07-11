@echo off
:: ============================================================
:: Aadhirai Pharma — Build Release Artifacts
:: Creates:
::   release\aadhirai-pharma-server.exe  (standalone server)
::   release\AadhiraiPharma-Setup-v1.0.0.exe  (full installer)
::
:: Requirements (install once):
::   - Node.js  https://nodejs.org
::   - Inno Setup 6  https://jrsoftware.org/isdl.php
:: ============================================================
setlocal EnableDelayedExpansion
title Aadhirai Pharma — Build Installer
color 0B
cd /d "%~dp0"

echo.
echo  ============================================================
echo    BUILD — Aadhirai Pharma Release
echo  ============================================================
echo.

:: ── Create release folder ────────────────────────────────────
if not exist release mkdir release

:: ── Stop running service so log files are not locked ─────────
echo [0/4] Stopping AadhiraiPharma service (if running)...
sc query AadhiraiPharma >nul 2>&1 && (
    sc stop AadhiraiPharma >nul 2>&1
    timeout /t 3 /nobreak >nul
    echo [OK] Service stopped.
)

:: ── STEP 1: Build the web app ────────────────────────────────
echo [1/4] Building application (npm run build)...
call npm run build
if %errorlevel% NEQ 0 (
    echo [ERROR] Build failed. Fix errors and retry.
    pause & exit /b 1
)
echo [OK] Build complete.

:: ── STEP 2: Package server into standalone .exe via pkg ──────
echo.
echo [2/4] Packaging server into standalone EXE (this may take a few minutes)...
echo       Downloading Node.js binaries for the first run — please wait...
call npx @yao-pkg/pkg dist/index.cjs --target node20-win-x64 --output release/aadhirai-pharma-server.exe
if %errorlevel% NEQ 0 (
    echo [ERROR] pkg packaging failed.
    pause & exit /b 1
)
echo [OK] release\aadhirai-pharma-server.exe created.

:: ── STEP 3: Find Inno Setup compiler ─────────────────────────
echo.
echo [3/4] Looking for Inno Setup compiler...
set ISCC=""
if exist "C:\Program Files (x86)\Inno Setup 7\ISCC.exe" set ISCC="C:\Program Files (x86)\Inno Setup 7\ISCC.exe"
if exist "C:\Program Files\Inno Setup 7\ISCC.exe"       set ISCC="C:\Program Files\Inno Setup 7\ISCC.exe"
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" set ISCC="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if exist "C:\Program Files\Inno Setup 6\ISCC.exe"       set ISCC="C:\Program Files\Inno Setup 6\ISCC.exe"

if %ISCC%=="" (
    echo.
    echo [WARNING] Inno Setup 6 not found.
    echo           Download and install it from: https://jrsoftware.org/isdl.php  (v6 or v7)
    echo           Then re-run this script to build the full installer EXE.
    echo.
    echo  The standalone server EXE is already at:
    echo    release\aadhirai-pharma-server.exe
    echo.
    pause & exit /b 0
)
echo [OK] Found Inno Setup: %ISCC%

:: ── STEP 4: Compile the installer ────────────────────────────
echo.
echo [4/4] Compiling installer...
%ISCC% deploy\installer.iss
if %errorlevel% NEQ 0 (
    echo [ERROR] Inno Setup compilation failed.
    pause & exit /b 1
)

echo.
echo  ============================================================
echo   BUILD COMPLETE!
echo  ============================================================
echo.
echo   Artifacts in the  release\  folder:
echo.
echo   aadhirai-pharma-server.exe      Standalone server (no Node.js needed)
echo   AadhiraiPharma-Setup-v1.0.0.exe Full installer wizard for client PCs
echo.
echo   Distribute the Setup EXE to pharmacy clients.
echo   They just double-click it and follow the wizard.
echo.

:: ── Restart the service after build ──────────────────────────
sc query AadhiraiPharma >nul 2>&1 && (
    echo Restarting AadhiraiPharma service...
    sc start AadhiraiPharma >nul 2>&1
)

pause
