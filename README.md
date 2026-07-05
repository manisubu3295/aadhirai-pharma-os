# Aadhirai Pharma Management System

A full-stack pharmacy management system built with Express.js, React, and PostgreSQL.
Runs fully **offline** as a Windows LAN portal — no internet required after setup.

---

## Table of Contents

- [Requirements](#requirements)
- [Fresh Installation](#fresh-installation)
- [Database Setup](#database-setup)
- [Accessing the App](#accessing-the-app)
- [Default Login Credentials](#default-login-credentials)
- [Future Updates](#future-updates)
- [Managing the Windows Service](#managing-the-windows-service)
- [Uninstall](#uninstall)
- [Troubleshooting](#troubleshooting)

---

## Requirements

| Software | Version | Download |
|---|---|---|
| Windows | 10 or 11 | — |
| Node.js | LTS (v20+) | https://nodejs.org |
| PostgreSQL | 15 or 16 | https://www.postgresql.org/download/windows |
| Git | Latest | https://git-scm.com/download/win |

> `setup.bat` auto-installs Node.js and PostgreSQL via `winget` if they are missing.

---

## Fresh Installation

### Step 1 — Clone the repository

Open **Command Prompt** or **PowerShell** and run:

```bash
git clone https://github.com/manisubu3295/aadhirai-pharma-os.git
cd aadhirai-pharma-os
```

### Step 2 — Run the installer

Right-click `setup.bat` → **Run as administrator**

The installer will:

1. Auto-install Node.js (if missing)
2. Auto-install PostgreSQL (if missing)
3. Ask for database configuration (host, port, name, password)
4. Write the `.env` configuration file
5. Install all dependencies (`npm ci`)
6. Build the application
7. Create the database
8. Push the schema (create all tables)
9. Seed default users and demo data
10. Register as a **Windows Service** (auto-starts with Windows)
11. Open firewall port for LAN access
12. Write `CREDENTIALS.txt` with all login details

---

## Database Setup (Standalone)

To set up or re-seed the database **independently** from the app build:

Right-click `seed-db.bat` → **Run as administrator**

```
Options:
  1. Push schema only    → creates/updates tables (safe to re-run)
  2. Seed data only      → inserts default users + demo medicines
  3. Both schema + seed  → full fresh database setup
```

### Manual commands (PowerShell / Command Prompt)

```bash
# Create / update all tables
npm run db:push

# Seed default users and demo data
npm run seed

# Both
npm run db:push && npm run seed
```

> The seed script is **idempotent** — if users already exist it skips and does nothing.

---

## Accessing the App

After installation, open a browser and go to:

| From | URL |
|---|---|
| This computer | `http://localhost:3000` |
| Other computers on the same network | `http://<SERVER-IP>:3000` |

To find the server's IP address:
```bash
ipconfig
# Look for "IPv4 Address" under your active network adapter
```

---

## Default Login Credentials

> **Change these passwords immediately after first login.**

| Role | Username | Password | Access |
|---|---|---|---|
| Owner | `owner` | `password123` | Full access |
| Pharmacist | `pharmacist` | `password123` | Inventory + dispensing |
| Cashier | `cashier` | `password123` | Billing only |

---

## Future Updates

Whenever a new version is released, run:

Right-click `update.bat` → **Run as administrator**

This will:
1. Pull the latest code from git (`git pull`)
2. Re-install dependencies
3. Rebuild the app
4. Optionally push schema changes (it will ask)
5. Restart the Windows Service

### Manual update steps

```bash
git pull origin main
npm ci
npm run build
npm run service:stop
npm run service:start
```

If the update includes database schema changes:
```bash
npm run db:push
```

---

## Managing the Windows Service

The app runs as a Windows Service named **AadhiraiPharma** and starts automatically when Windows boots.

| Action | Command |
|---|---|
| Start service | `npm run service:start` |
| Stop service | `npm run service:stop` |
| Restart | `npm run service:stop` then `npm run service:start` |
| Remove service | `uninstall.bat` (Run as Admin) |

You can also manage it from **Windows Services** (`services.msc`).

---

## Uninstall

Right-click `uninstall.bat` → **Run as administrator**

This removes the Windows Service and firewall rule.  
**The database and application files are NOT deleted** — remove them manually if needed.

---

## Troubleshooting

### App does not start / service fails
```bash
# Run manually to see errors
npm start
```
Check that `.env` exists and `DATABASE_URL` is correct.

### Cannot connect to database
- Make sure PostgreSQL service is running: open `services.msc` → find **postgresql-x64-16** → Start
- Verify credentials: `psql -U postgres -h localhost -p 5432`

### Other computers cannot access the app
- Confirm the firewall rule exists: `netsh advfirewall firewall show rule name="AadhiraiPharma"`
- Re-add if missing: `netsh advfirewall firewall add rule name="AadhiraiPharma" dir=in action=allow protocol=TCP localport=3000`
- Make sure all devices are on the **same local network**

### Port already in use
Change `PORT=3000` in `.env` to another port (e.g. `3001`) then restart the service.

### Re-seed wiped database
```bash
seed-db.bat  →  choose option 3
```

---

## Project Structure (deployment-relevant files)

```
├── setup.bat          ← First-time full installer
├── seed-db.bat        ← Standalone DB schema + seed
├── update.bat         ← Pull + rebuild + restart
├── uninstall.bat      ← Remove Windows Service
├── .env.example       ← Config template (copy → .env)
├── deploy/
│   ├── setup-service.js    ← Windows Service manager
│   └── create-database.sql ← Manual DB creation script
└── server/
    └── seed.ts        ← Seed script source
```

---

## Support

For issues contact the development team.
