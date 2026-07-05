# Aadhirai Pharma — On-Site Deployment Guide

## Overview

This app runs **entirely offline** on a Windows PC at your location.  
No cloud, no internet required after setup.  
All staff access it from their computers via the **local network (LAN)**.

```
[Pharmacy PC — runs the server]            [Staff Computers]
  ├── PostgreSQL (database)       ←──  Browser: http://192.168.x.x:3000
  ├── Node.js App (Express)       ←──  Browser: http://192.168.x.x:3000
  └── Always on, starts with Windows
```

---

## Prerequisites (one-time, install on the server PC)

### 1. Node.js (v20 or v22 LTS)
- Download: https://nodejs.org → click **LTS**
- Install with default settings
- Verify: open Command Prompt → `node -v`

### 2. PostgreSQL (v14 or v16)
- Download: https://www.postgresql.org/download/windows/
- During install:
  - Set a **password** for the `postgres` user (remember this!)
  - Keep default port: **5432**
  - Install **pgAdmin** (optional, useful for DB management)
- After install, make sure the PostgreSQL service is running (check Services in Task Manager)

### 3. Application Files
- Copy the entire project folder to the server PC (e.g., `C:\AadhiraiPharma\`)

---

## Installation Steps

### Step 1 — Create the Database
Open **pgAdmin** or run in Command Prompt:
```bat
psql -U postgres -f deploy\create-database.sql
```
Enter your postgres password when prompted.

### Step 2 — Run the Installer
1. Right-click `install.bat`
2. Select **"Run as administrator"**
3. Follow the prompts:
   - Enter your PostgreSQL password
   - Accept default port (3000) or choose another
4. The installer will:
   - Write your `.env` configuration
   - Build the application
   - Set up the database schema
   - Register a **Windows Service** (auto-starts with PC)
   - Open firewall port for LAN access

### Step 3 — Open in Browser
- On the server PC: http://localhost:3000
- On any other PC in the pharmacy: http://[SERVER-IP]:3000

**To find server IP:** Open Command Prompt → type `ipconfig` → look for **IPv4 Address**

---

## Day-to-Day

| Task | How |
|---|---|
| App stops working | Check if PC is on and PostgreSQL service is running |
| Add new staff computer | Just open browser → http://[SERVER-IP]:3000 |
| Restart app | `deploy\setup-service.js restart` (as Admin) |
| Stop app | `deploy\setup-service.js stop` (as Admin) |
| Uninstall | Run `uninstall.bat` as Admin |

---

## Backup the Database

Run this command periodically to back up all pharmacy data:
```bat
pg_dump -U postgres aadhirai_pharma > backup_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%.sql
```
Store the `.sql` backup file on a USB drive or external location.

**Restore from backup:**
```bat
psql -U postgres -d aadhirai_pharma < backup_YYYYMMDD.sql
```

---

## Port Reference

| Service | Default Port | Change in |
|---|---|---|
| App (Express) | 3000 | `.env` → `PORT=xxxx` |
| PostgreSQL | 5432 | PostgreSQL installer |

---

## Configuration File (`.env`)

Located in the app root folder. Edit to change settings:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/aadhirai_pharma
NODE_ENV=production
PORT=3000
SESSION_SECRET=change-this-to-a-long-random-string
```

After editing `.env`, restart the Windows Service for changes to take effect.

---

## Troubleshooting

**"Cannot connect to database"**
- Check PostgreSQL is running: Task Manager → Services → `postgresql-x64-xx`
- Verify credentials in `.env` match your postgres password

**"Cannot access from other computers"**
- Check firewall: `install.bat` adds the rule automatically
- Manually: Windows Defender Firewall → Inbound Rules → Allow TCP port 3000
- Ensure all computers are on the same Wi-Fi/LAN network

**"App not starting after Windows reboot"**
- Open Services (Win+R → `services.msc`) → find `AadhiraiPharma` → set Startup Type to Automatic
- Also ensure `postgresql-x64-xx` is set to Automatic

**App shows "Cannot reach this page"**
- Run as Admin: `node deploy\setup-service.js start`

---

## Need Help?

Contact your system administrator or the software vendor.
