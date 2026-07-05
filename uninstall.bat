@echo off
:: ============================================================
:: Aadhirai Pharma — Uninstaller
:: Right-click → "Run as Administrator"
:: ============================================================
setlocal EnableDelayedExpansion
title Aadhirai Pharma Uninstaller
color 0C

echo.
echo  =====================================================
echo   AADHIRAI PHARMA — Uninstaller
echo  =====================================================
echo.

net session >nul 2>&1
if %errorlevel% NEQ 0 (
    echo [ERROR] Please run as Administrator.
    pause & exit /b 1
)

set /p CONFIRM="This will stop and remove the Windows Service. Continue? (y/n): "
if /i "!CONFIRM!" NEQ "y" exit /b 0

echo.
echo [...] Stopping and removing Windows Service...
node deploy\setup-service.js uninstall

echo [...] Removing firewall rule...
netsh advfirewall firewall delete rule name="AadhiraiPharma" >nul 2>&1

echo.
echo [OK] Service removed.
echo [INFO] Database and application files are NOT deleted.
echo        To delete data, manually drop the PostgreSQL database.
echo.
pause
