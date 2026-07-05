@echo off
:: ============================================================
:: Aadhirai Pharma — Update Script
:: Run after "git pull" to apply new code changes
:: Does NOT touch the database or credentials
:: Right-click → "Run as Administrator"
:: ============================================================
setlocal EnableDelayedExpansion
title Aadhirai Pharma Update
color 0E
cd /d "%~dp0"

echo.
echo  ================================================================
echo    AADHIRAI PHARMA — Update
echo  ================================================================
echo.

net session >nul 2>&1
if %errorlevel% NEQ 0 (
    echo [ERROR] Run as Administrator.
    pause & exit /b 1
)

:: ── Pull latest code ────────────────────────────────────────
echo [STEP 1] Pulling latest code from git...
git pull origin main
if %errorlevel% NEQ 0 (
    echo [ERROR] git pull failed. Check your internet connection or resolve conflicts.
    pause & exit /b 1
)
echo [OK] Code updated.

:: ── Install/update dependencies ─────────────────────────────
echo.
echo [STEP 2] Updating dependencies...
call npm ci
if %errorlevel% NEQ 0 (
    echo [ERROR] npm ci failed.
    pause & exit /b 1
)
echo [OK] Dependencies ready.

:: ── Rebuild app ─────────────────────────────────────────────
echo.
echo [STEP 3] Building application...
call npm run build
if %errorlevel% NEQ 0 (
    echo [ERROR] Build failed.
    pause & exit /b 1
)
echo [OK] Build complete.

:: ── If schema changed, push it ──────────────────────────────
echo.
set /p "SCHEMA_CHANGED=Did this update include database changes? (y/n): "
if /i "!SCHEMA_CHANGED!"=="y" (
    echo [...] Pushing schema changes...
    call npm run db:push -- --force
    if !errorlevel! NEQ 0 (
        echo [ERROR] Schema push failed.
        pause & exit /b 1
    )
    echo [OK] Schema updated.
)

:: ── Restart Windows Service ──────────────────────────────────
echo.
echo [STEP 4] Restarting service...
node deploy\setup-service.js stop
timeout /t 3 /nobreak >nul
node deploy\setup-service.js start
echo [OK] Service restarted.

echo.
echo  ================================================================
echo   Update complete! App is running with the latest version.
echo  ================================================================
echo.
pause
