@echo off
:: ============================================================
:: Aadhirai Pharma — Database Setup & Seed
:: Run this independently from the app build
:: Requirements: .env must exist, PostgreSQL must be running
:: ============================================================
setlocal EnableDelayedExpansion
title Aadhirai Pharma — DB Setup
color 0B
cd /d "%~dp0"

echo.
echo  ================================================================
echo    AADHIRAI PHARMA — Database Setup
echo  ================================================================
echo.

:: ── Check .env exists ───────────────────────────────────────
if not exist ".env" (
    echo [ERROR] .env file not found.
    echo         Run setup.bat first, or create .env manually from .env.example
    pause & exit /b 1
)
echo [OK] .env found.

:: ── Read DATABASE_URL from .env ─────────────────────────────
for /f "tokens=1,* delims==" %%a in (.env) do (
    if "%%a"=="DATABASE_URL" set DB_URL=%%b
)
if "!DB_URL!"=="" (
    echo [ERROR] DATABASE_URL not found in .env
    pause & exit /b 1
)
echo [OK] Database URL: !DB_URL!
echo.

:: ── Check npm deps are installed ────────────────────────────
if not exist "node_modules" (
    echo [...] node_modules not found. Running npm ci...
    call npm ci
    if !errorlevel! NEQ 0 (
        echo [ERROR] npm ci failed.
        pause & exit /b 1
    )
)

:: ── Menu ────────────────────────────────────────────────────
echo  What do you want to do?
echo.
echo   1. Push schema only    (create/update tables, safe to re-run)
echo   2. Seed data only      (insert default users + demo data)
echo   3. Both schema + seed  (full fresh setup)
echo   4. Exit
echo.
set /p "CHOICE=  Enter choice [1-4]: "

if "!CHOICE!"=="1" goto :schema
if "!CHOICE!"=="2" goto :seed
if "!CHOICE!"=="3" goto :both
if "!CHOICE!"=="4" exit /b 0
echo [ERROR] Invalid choice.
pause & exit /b 1

:: ── Schema push ─────────────────────────────────────────────
:schema
echo.
echo [...] Pushing database schema (creating/updating tables)...
call npm run db:push -- --force
if %errorlevel% NEQ 0 (
    echo [ERROR] Schema push failed. Check your DATABASE_URL in .env and ensure PostgreSQL is running.
    pause & exit /b 1
)
echo [OK] Schema push complete.
goto :done

:: ── Seed only ───────────────────────────────────────────────
:seed
echo.
echo [...] Running seed script...
call npm run seed
if %errorlevel% NEQ 0 (
    echo [WARNING] Seed had an issue (may already be seeded — check output above).
) else (
    echo [OK] Seed complete.
)
goto :done

:: ── Both ────────────────────────────────────────────────────
:both
echo.
echo [...] Step 1/2 — Pushing schema...
call npm run db:push -- --force
if %errorlevel% NEQ 0 (
    echo [ERROR] Schema push failed.
    pause & exit /b 1
)
echo [OK] Schema done.
echo.
echo [...] Step 2/2 — Seeding data...
call npm run seed
if %errorlevel% NEQ 0 (
    echo [WARNING] Seed had an issue (may already be seeded).
) else (
    echo [OK] Seed done.
)
goto :done

:: ── Done ────────────────────────────────────────────────────
:done
echo.
echo  ================================================================
echo   Database setup complete!
echo.
echo   Default login credentials:
echo     Owner      : username=owner       password=password123
echo     Pharmacist : username=pharmacist  password=password123
echo     Cashier    : username=cashier     password=password123
echo.
echo   Change passwords after first login!
echo  ================================================================
echo.
pause
