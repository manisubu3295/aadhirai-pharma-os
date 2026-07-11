@echo off
:: ============================================================
:: Aadhirai Pharma — Full Setup Script
:: Run ONCE after "git clone" or "git pull"
:: Right-click → "Run as Administrator"
:: ============================================================
setlocal EnableDelayedExpansion
title Aadhirai Pharma Setup
color 0A
cd /d "%~dp0"

echo.
echo  ================================================================
echo    AADHIRAI PHARMA MANAGEMENT SYSTEM — Setup
echo  ================================================================
echo.

:: ── Admin check ─────────────────────────────────────────────
net session >nul 2>&1
if %errorlevel% NEQ 0 (
    echo [ERROR] Run this script as Administrator.
    echo         Right-click setup.bat ^> Run as administrator
    pause & exit /b 1
)

:: ================================================================
:: STEP 1 — Check / Install Node.js
:: ================================================================
echo [STEP 1] Checking Node.js...
where node >nul 2>&1
if %errorlevel% NEQ 0 (
    echo [...] Node.js not found. Installing via winget...
    winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    if !errorlevel! NEQ 0 (
        echo.
        echo [ERROR] Could not auto-install Node.js.
        echo         Please download and install from: https://nodejs.org  (LTS)
        echo         Then re-run this script.
        pause & exit /b 1
    )
    :: Refresh PATH
    call RefreshEnv.cmd 2>nul
    for /f "tokens=*" %%p in ('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\"PATH\",\"Machine\") + \";\" + [Environment]::GetEnvironmentVariable(\"PATH\",\"User\")"') do set PATH=%%p
)
for /f "tokens=*" %%v in ('node -v 2^>nul') do set NODE_VER=%%v
echo [OK] Node.js: %NODE_VER%

:: ================================================================
:: STEP 2 — Check / Install PostgreSQL
:: ================================================================
echo.
echo [STEP 2] Checking PostgreSQL...

set PG_INSTALLED=0
where psql >nul 2>&1 && set PG_INSTALLED=1
if "%PG_INSTALLED%"=="0" (
    :: Check common install paths (versions 18 down to 14)
    for %%V in (18 17 16 15 14) do (
        if exist "C:\Program Files\PostgreSQL\%%V\bin\psql.exe" (
            set "PATH=%PATH%;C:\Program Files\PostgreSQL\%%V\bin"
            set PG_INSTALLED=1
        )
    )
)

if "%PG_INSTALLED%"=="0" (
    echo [...] PostgreSQL not found. Installing via winget...
    winget install -e --id PostgreSQL.PostgreSQL.16 --silent --accept-package-agreements --accept-source-agreements
    if !errorlevel! NEQ 0 (
        echo.
        echo [INFO] winget install failed. Trying download...
        echo [...] Downloading PostgreSQL 16 installer (~300MB)...
        powershell -NoProfile -Command "& { $ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://sbp.enterprisedb.com/getfile.jsp?fileid=1258893' -OutFile '%TEMP%\pg_installer.exe' }"
        if exist "%TEMP%\pg_installer.exe" (
            echo [...] Running PostgreSQL installer (follow the prompts)...
            echo [!] Set the superuser password to: admin123  (or any password you prefer)
            echo     Remember this password — you will enter it in the next step.
            pause
            "%TEMP%\pg_installer.exe"
            set "PATH=%PATH%;C:\Program Files\PostgreSQL\16\bin"
        ) else (
            echo [ERROR] Could not download PostgreSQL installer.
            echo         Please install manually: https://www.postgresql.org/download/windows/
            echo         Then re-run this script.
            pause & exit /b 1
        )
    ) else (
        :: After winget install, add to PATH
        set "PATH=%PATH%;C:\Program Files\PostgreSQL\16\bin"
    )
    echo [OK] PostgreSQL installed.
) else (
    echo [OK] PostgreSQL found.
)

:: ================================================================
:: STEP 3 — Configure Database Credentials
:: ================================================================
echo.
echo [STEP 3] Database Configuration
echo  (Press Enter to use the default shown in brackets)
echo.

set "DB_HOST=localhost"
set "DB_PORT=5432"
set "DB_NAME=aadhirai_pharma"
set "DB_USER=postgres"

set /p "DB_HOST_IN=  PostgreSQL Host [localhost]: "
if not "!DB_HOST_IN!"=="" set DB_HOST=!DB_HOST_IN!

set /p "DB_PORT_IN=  PostgreSQL Port [5432]: "
if not "!DB_PORT_IN!"=="" set DB_PORT=!DB_PORT_IN!

set /p "DB_NAME_IN=  Database Name [aadhirai_pharma]: "
if not "!DB_NAME_IN!"=="" set DB_NAME=!DB_NAME_IN!

set /p "DB_USER_IN=  DB User [postgres]: "
if not "!DB_USER_IN!"=="" set DB_USER=!DB_USER_IN!

set /p "DB_PASS=  DB Password (the one you set during PostgreSQL install): "

set /p "APP_PORT_IN=  App Port [3000]: "
if "!APP_PORT_IN!"=="" (set APP_PORT=3000) else (set APP_PORT=!APP_PORT_IN!)

:: Generate a random session secret
for /f "tokens=*" %%r in ('powershell -NoProfile -Command "[System.Guid]::NewGuid().ToString(\"N\") + [System.Guid]::NewGuid().ToString(\"N\")"') do set SESSION_SECRET=%%r

:: ================================================================
:: STEP 4 — Write .env
:: ================================================================
echo.
echo [STEP 4] Writing .env configuration...
(
echo DATABASE_URL=postgresql://!DB_USER!:!DB_PASS!@!DB_HOST!:!DB_PORT!/!DB_NAME!
echo NODE_ENV=production
echo PORT=!APP_PORT!
echo SESSION_SECRET=!SESSION_SECRET!
echo AI_ASSISTANT_PROVIDER=none
echo GEMINI_API_KEY=
echo AI_ASSISTANT_MODEL=
) > .env
echo [OK] .env written.

:: ================================================================
:: STEP 5 — Install npm dependencies
:: ================================================================
echo.
echo [STEP 5] Installing dependencies (may take a few minutes on first run)...
call npm ci
if %errorlevel% NEQ 0 (
    echo [ERROR] npm install failed.
    pause & exit /b 1
)
echo [OK] Dependencies installed.

:: ================================================================
:: STEP 6 — Build application
:: ================================================================
echo.
echo [STEP 6] Building application...
call npm run build
if %errorlevel% NEQ 0 (
    echo [ERROR] Build failed.
    pause & exit /b 1
)
echo [OK] Build complete.

:: ================================================================
:: STEP 7 — Create PostgreSQL database
:: ================================================================
echo.
echo [STEP 7] Creating database...
set "PGPASSWORD=!DB_PASS!"
psql -U !DB_USER! -h !DB_HOST! -p !DB_PORT! -c "SELECT 1 FROM pg_database WHERE datname='!DB_NAME!'" | find "1 row" >nul 2>&1
if %errorlevel% NEQ 0 (
    psql -U !DB_USER! -h !DB_HOST! -p !DB_PORT! -c "CREATE DATABASE !DB_NAME!;" 2>&1
    if !errorlevel! NEQ 0 (
        echo [ERROR] Could not create database. Check your PostgreSQL password.
        pause & exit /b 1
    )
    echo [OK] Database "!DB_NAME!" created.
) else (
    echo [OK] Database "!DB_NAME!" already exists.
)

:: ================================================================
:: STEP 8 — Push schema (create all tables)
:: ================================================================
echo.
echo [STEP 8] Creating database tables (schema push)...
call npm run db:push -- --force
if %errorlevel% NEQ 0 (
    echo [ERROR] Schema push failed. Check DB connection.
    pause & exit /b 1
)
echo [OK] Tables created.

:: ================================================================
:: STEP 9 — Seed initial data
:: ================================================================
echo.
echo [STEP 9] Seeding initial users and demo data...
call npm run seed
if %errorlevel% NEQ 0 (
    echo [WARNING] Seed script had an issue (may already be seeded — continuing).
) else (
    echo [OK] Seed complete.
)

:: ================================================================
:: STEP 10 — Install as Windows Service
:: ================================================================
echo.
echo [STEP 10] Installing as Windows Service (auto-starts with Windows)...
node deploy\setup-service.js install
if %errorlevel% NEQ 0 (
    echo [WARNING] Service install had an issue. You can start manually with: npm start
)

:: ================================================================
:: STEP 11 — Windows Firewall rule for LAN access
:: ================================================================
echo.
echo [STEP 11] Adding firewall rule for LAN access on port !APP_PORT!...
netsh advfirewall firewall delete rule name="AadhiraiPharma" >nul 2>&1
netsh advfirewall firewall add rule name="AadhiraiPharma" dir=in action=allow protocol=TCP localport=!APP_PORT! >nul
echo [OK] Firewall rule added.

:: ================================================================
:: STEP 12 — Write CREDENTIALS.txt
:: ================================================================
echo.
echo [STEP 12] Writing credentials file...
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' } | Select-Object -First 1).IPAddress"') do set LAN_IP=%%i

(
echo ================================================================
echo  AADHIRAI PHARMA — Installation Details
echo  Generated: %DATE% %TIME%
echo ================================================================
echo.
echo  APPLICATION ACCESS
echo  ------------------
echo  This Computer  : http://localhost:!APP_PORT!
echo  LAN / Network  : http://!LAN_IP!:!APP_PORT!
echo  (Share the LAN URL with other computers on the same network)
echo.
echo  DEFAULT LOGIN CREDENTIALS
echo  -------------------------
echo  Owner     : username = owner        password = password123
echo  Pharmacist: username = pharmacist   password = password123
echo  Cashier   : username = cashier      password = password123
echo.
echo  IMPORTANT: Change these passwords after first login!
echo.
echo  DATABASE CREDENTIALS
echo  --------------------
echo  Host     : !DB_HOST!
echo  Port     : !DB_PORT!
echo  Database : !DB_NAME!
echo  User     : !DB_USER!
echo  Password : !DB_PASS!
echo.
echo  MANAGE THE SERVICE (run as Admin^)
echo  -----------------------------------
echo  Start   : npm run service:start
echo  Stop    : npm run service:stop
echo  Restart : npm run service:stop ^&^& npm run service:start
echo  Remove  : uninstall.bat
echo ================================================================
) > CREDENTIALS.txt
echo [OK] CREDENTIALS.txt written.

:: ================================================================
:: DONE
:: ================================================================
echo.
echo  ================================================================
echo   SETUP COMPLETE!
echo  ================================================================
echo.
type CREDENTIALS.txt
echo.

set /p "OPEN_NOW=Open the app in browser now? (y/n): "
if /i "!OPEN_NOW!"=="y" start http://localhost:!APP_PORT!

echo.
echo  Keep CREDENTIALS.txt in a safe place.
echo.
pause
