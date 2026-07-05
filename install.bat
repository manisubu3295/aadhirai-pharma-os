@echo off
:: ============================================================
:: Aadhirai Pharma — One-Click Installer for Windows
:: Right-click → "Run as Administrator"
:: ============================================================
setlocal EnableDelayedExpansion
title Aadhirai Pharma Installer
color 0A

echo.
echo  =====================================================
echo   AADHIRAI PHARMA — On-Site Installer
echo  =====================================================
echo.

:: ── 1. Check Admin privileges ───────────────────────────────
net session >nul 2>&1
if %errorlevel% NEQ 0 (
    echo [ERROR] Please run this script as Administrator.
    echo         Right-click install.bat ^> Run as administrator
    pause & exit /b 1
)

:: ── 2. Check Node.js ────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% NEQ 0 (
    echo [ERROR] Node.js is not installed.
    echo         Download and install from: https://nodejs.org  (LTS version)
    echo         Then re-run this installer.
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo [OK] Node.js found: %NODE_VER%

:: ── 3. Check PostgreSQL ─────────────────────────────────────
where psql >nul 2>&1
if %errorlevel% NEQ 0 (
    echo.
    echo [WARNING] psql (PostgreSQL client) not found in PATH.
    echo           Make sure PostgreSQL is installed and running.
    echo           Download: https://www.postgresql.org/download/windows/
    echo           The app needs PostgreSQL 14 or higher.
    echo.
    set /p CONTINUE="Continue anyway? (y/n): "
    if /i "!CONTINUE!" NEQ "y" exit /b 1
) else (
    echo [OK] PostgreSQL client found.
)

:: ── 4. Configure database connection ─────────────────────────
echo.
echo  --- Database Configuration ---
echo  (Press Enter to accept the default shown in brackets)
echo.

set DEFAULT_HOST=localhost
set DEFAULT_PORT=5432
set DEFAULT_DBNAME=aadhirai_pharma
set DEFAULT_USER=postgres

set /p DB_HOST="  PostgreSQL Host [%DEFAULT_HOST%]: "
if "!DB_HOST!"=="" set DB_HOST=%DEFAULT_HOST%

set /p DB_PORT="  PostgreSQL Port [%DEFAULT_PORT%]: "
if "!DB_PORT!"=="" set DB_PORT=%DEFAULT_PORT%

set /p DB_NAME="  Database Name [%DEFAULT_DBNAME%]: "
if "!DB_NAME!"=="" set DB_NAME=%DEFAULT_DBNAME%

set /p DB_USER="  Database User [%DEFAULT_USER%]: "
if "!DB_USER!"=="" set DB_USER=%DEFAULT_USER%

set /p DB_PASS="  Database Password: "

set DATABASE_URL=postgresql://!DB_USER!:!DB_PASS!@!DB_HOST!:!DB_PORT!/!DB_NAME!

:: ── 5. Configure app port ────────────────────────────────────
echo.
set /p APP_PORT="  App Port [3000] (staff will open http://THIS-PC-IP:PORT): "
if "!APP_PORT!"=="" set APP_PORT=3000

:: ── 6. Write .env file ───────────────────────────────────────
echo.
echo [...] Writing .env configuration...
(
echo DATABASE_URL=!DATABASE_URL!
echo NODE_ENV=production
echo PORT=!APP_PORT!
echo SESSION_SECRET=aadhirai-pharma-secret-%RANDOM%%RANDOM%
echo AI_ASSISTANT_PROVIDER=none
) > .env
echo [OK] .env written.

:: ── 7. Install npm dependencies ──────────────────────────────
echo.
echo [...] Installing application dependencies (this may take a few minutes)...
call npm ci --omit=dev
if %errorlevel% NEQ 0 (
    echo [ERROR] npm install failed. Check internet connection for first-time setup.
    pause & exit /b 1
)
echo [OK] Dependencies installed.

:: ── 8. Install node-windows for service management ───────────
echo [...] Installing node-windows...
call npm install node-windows --save-optional 2>nul
echo [OK] node-windows ready.

:: ── 9. Build the application ─────────────────────────────────
echo.
echo [...] Building application...
call npm run build
if %errorlevel% NEQ 0 (
    echo [ERROR] Build failed.
    pause & exit /b 1
)
echo [OK] Build complete.

:: ── 10. Push database schema ─────────────────────────────────
echo.
echo [...] Setting up database schema...
call npm run db:push
if %errorlevel% NEQ 0 (
    echo [ERROR] Database schema push failed.
    echo         Check your PostgreSQL credentials and ensure the DB server is running.
    pause & exit /b 1
)
echo [OK] Database schema ready.

:: ── 11. Install Windows Service ──────────────────────────────
echo.
echo [...] Installing as Windows Service (auto-starts with Windows)...
node deploy\setup-service.js install
if %errorlevel% NEQ 0 (
    echo [WARNING] Service installation encountered an issue.
    echo           The app can still be started manually with: npm start
)

:: ── 12. Configure Windows Firewall ───────────────────────────
echo.
echo [...] Opening firewall port %APP_PORT% for LAN access...
netsh advfirewall firewall add rule name="AadhiraiPharma" dir=in action=allow protocol=TCP localport=%APP_PORT% >nul 2>&1
echo [OK] Firewall rule added.

:: ── 13. Get LAN IP ───────────────────────────────────────────
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    set LAN_IP=%%a
    goto :got_ip
)
:got_ip
set LAN_IP=%LAN_IP: =%

:: ── 14. Done ─────────────────────────────────────────────────
echo.
echo  =====================================================
echo   INSTALLATION COMPLETE!
echo  =====================================================
echo.
echo   Access from THIS computer:  http://localhost:%APP_PORT%
if defined LAN_IP (
echo   Access from LAN computers:  http://%LAN_IP%:%APP_PORT%
)
echo.
echo   The app starts automatically when Windows starts.
echo   To manage the service: deploy\setup-service.js [start^|stop^|uninstall]
echo.
echo  =====================================================

:: ── 15. Open browser ─────────────────────────────────────────
set /p OPEN_BROWSER="Open the app in browser now? (y/n): "
if /i "!OPEN_BROWSER!"=="y" start http://localhost:%APP_PORT%

pause
