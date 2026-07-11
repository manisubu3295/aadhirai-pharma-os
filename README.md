# Aadhirai Pharma Management System

A pharmacy management system that runs fully **offline** on Windows.
Access it from any computer on the same network using just a web browser.

---

## 📋 Quick Navigation

- [For Users — Install using Setup Wizard](#-for-users--install-using-setup-wizard) ← **Start here if you just want to install**
- [For Developers — Source Code Setup](#-for-developers--source-code-setup)
- [Default Login Credentials](#-default-login-credentials)
- [Accessing the App](#-accessing-the-app)
- [Updating the App](#-updating-the-app)
- [Uninstall](#-uninstall)
- [Troubleshooting](#-troubleshooting)
- [Project Structure](#-project-structure-deployment-relevant-files)

---

## 👨‍💼 For Users — Install using Setup Wizard

> No technical knowledge required. Node.js is **not** needed on this computer —
> the installer ships a self-contained server. Follow these steps on the
> **pharmacy server PC** (the main computer that will host the app).

### Before you begin

Make sure **PostgreSQL** is installed on this computer.
👉 Download: https://www.postgresql.org/download/windows
During installation, set a password for the `postgres` user — **remember this
password**, you will need it during setup. Any version 15–18 works; the
installer auto-detects whichever one is installed.

---

### Step 1 — Download the installer

Go to the **`release` branch** of this repository and download:

```
AadhiraiPharma-Setup-v1.0.0.exe
```

That single file is everything you need — it bundles the server itself.

---

### Step 2 — Run as Administrator

1. Right-click `AadhiraiPharma-Setup-v1.0.0.exe`
2. Click **"Run as administrator"**
3. Click **Yes** if Windows asks for permission

---

### Step 3 — Follow the Setup Wizard

The wizard will ask you a few questions:

| Question | What to enter |
|----------|--------------|
| Database name | Leave as default (`medora_shivalaya`) or type your preferred name |
| Application port | Leave as `3000` (press Next) |
| PostgreSQL password | Enter the password you set during PostgreSQL installation |

Click **Next** through the remaining screens and wait for installation to
finish (~1–2 minutes).

---

### Step 4 — Confirm it started correctly

The wizard lets you pick any install folder (it's not always Program
Files), so use the **Start Menu → Aadhirai Pharma → "View Install Status"**
shortcut rather than guessing a path — it always opens the right file
regardless of where you installed. ("Open Install Folder" is also there if
you need to browse the folder itself.)

It will say either **"Successfully installed / started"** with the URL the
app is running on, or describe the exact error if something went wrong (for
example, a database connection failure). This is the first place to look if
the app doesn't open — see [Troubleshooting](#-troubleshooting).

---

### Step 5 — Open the app

Once installation is complete:
- A **"Aadhirai Pharma" shortcut** will appear on the Desktop
- Double-click it to open the app in your browser
- Or open any browser and go to: **http://localhost:3000**

---

### Step 6 — First login

Use these default credentials (change them after first login):

| Role | Username | Password |
|------|----------|----------|
| Owner / Admin | `owner` | `password123` |
| Pharmacist | `pharmacist` | `password123` |
| Cashier | `cashier` | `password123` |

> ⚠️ **Change all passwords immediately after first login** via Settings → User Management.

---

### Other computers on the same network

On any other PC connected to the same Wi-Fi or LAN (e.g. a billing counter
that isn't the main server PC):
1. Open a browser
2. Go to `http://[SERVER-IP]:3000`
   *(Replace `[SERVER-IP]` with the IP address of the server PC — find it by
   running `ipconfig` on the server PC and looking for **IPv4 Address**)*

---

## 🔧 For Developers — Source Code Setup

### Requirements

| Software | Version | Download |
|---|---|---|
| Windows | 10 or 11 | — |
| Node.js | LTS (v20+) | https://nodejs.org |
| PostgreSQL | 15–18 | https://www.postgresql.org/download/windows |
| Git | Latest | https://git-scm.com/download/win |

> `setup.bat` auto-installs Node.js and PostgreSQL via `winget` if they are missing.

### Clone and install

```bash
git clone https://github.com/manisubu3295/aadhirai-pharma-os.git
cd aadhirai-pharma-os
```

Right-click `setup.bat` → **Run as administrator** and follow the prompts. It will:

1. Auto-install Node.js (if missing)
2. Auto-install PostgreSQL (if missing)
3. Ask for database configuration (host, port, name, password)
4. Write the `.env` configuration file
5. Install all dependencies (`npm ci`)
6. Build the application
7. Create the database, push the schema, and seed default users
8. Register as a **Windows Service** (auto-starts with Windows)
9. Open the firewall port for LAN access
10. Write `CREDENTIALS.txt` with all login details

### Development server

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Build the standalone installer EXE

Requires [Inno Setup 7](https://jrsoftware.org/isdl.php) installed.

```bat
build-installer.bat
```

This runs `npm run build`, packages the server with `pkg` (using
`pkg-config.json` to control what gets bundled — **do not** point `pkg` at
the full `package.json` directly, it drags in every dependency's raw source
and bloats the EXE from ~50MB to 160MB+), then compiles the Inno Setup
installer. Outputs to `release\`:

- `aadhirai-pharma-server.exe` — standalone server (no Node.js required to run it)
- `AadhiraiPharma-Setup-v1.0.0.exe` — full setup wizard for client machines

Before shipping a rebuilt installer, always smoke-test the standalone EXE
against a **completely fresh, empty database** (not your existing dev DB) —
most real bugs in this app only show up on a first-run/empty database, not
one that already has tables from `drizzle-kit push`.

### Database commands

```bash
npm run db:push   # apply schema changes (dev only — the packaged exe bootstraps its own tables on first run)
npm run seed      # seed default users & demo data
```

Standalone DB setup/reseed without a full build:

Right-click `seed-db.bat` → **Run as administrator**

```
Options:
  1. Push schema only    → creates/updates tables (safe to re-run)
  2. Seed data only      → inserts default users + demo medicines
  3. Both schema + seed  → full fresh database setup
```

> The seed script is **idempotent** — if users already exist it skips and does nothing.

---

## 🔑 Default Login Credentials

> **Change all passwords immediately after first login** via Settings → User Management.

| Role | Username | Password | Access |
|------|----------|----------|--------|
| Owner / Admin | `owner` | `password123` | Full access |
| Pharmacist | `pharmacist` | `password123` | Inventory + dispensing |
| Cashier | `cashier` | `password123` | Billing only |

---

## 🌐 Accessing the App

| From | URL |
|------|-----|
| This computer | `http://localhost:3000` |
| Other PCs on same network | `http://<SERVER-IP>:3000` |

Find your server IP: open Command Prompt → type `ipconfig` → look for **IPv4 Address**.

---

## 🔄 Updating the App

**Via installer (recommended for non-technical users):**
Download and run the new `AadhiraiPharma-Setup-v1.0.0.exe` from the `release` branch.

**Via source (developers):**

Right-click `update.bat` → **Run as administrator**. This will:
1. Pull the latest code from git (`git pull`)
2. Re-install dependencies
3. Rebuild the app
4. Optionally push schema changes (it will ask)
5. Restart the Windows Service

Manual steps, if you prefer:

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

## ❌ Uninstall

**Installer-based install:** Windows Settings → Apps → Aadhirai Pharma → Uninstall.

**Source install:** Right-click `uninstall.bat` → Run as administrator.

Either way, this removes the Windows Service and firewall rule.
**The database and application files are NOT deleted** — remove them manually if needed.

---

## 🛠 Troubleshooting

| Problem | Solution |
|---------|---------|
| App won't open in browser | Check `install-status.txt` in the install folder first (see below). Then confirm the **AadhiraiPharma** Windows service is running (`services.msc`) |
| "Cannot connect to database" | Open `services.msc` → start **postgresql-x64-\<version\>** (e.g. `postgresql-x64-18`). Verify credentials: `psql -U postgres -h localhost -p 5432` |
| Login "succeeds" but immediately looks logged out | Only happens if accessing over something other than `localhost` (e.g. a LAN IP) with an older install — confirm `.env` has `SESSION_COOKIE_SECURE=false`. Reinstalling with the current installer sets this automatically |
| Other computers can't access | Confirm the firewall rule: `netsh advfirewall firewall show rule name="AadhiraiPharma"`. Re-add if missing: `netsh advfirewall firewall add rule name="AadhiraiPharma" dir=in action=allow protocol=TCP localport=3000`. Make sure all devices are on the same local network |
| Forgot login password | Contact your system administrator to reset via User Management |
| Port already in use | Change `PORT=3000` in `.env` to another number and restart the service |
| Re-seed wiped database | `seed-db.bat` → choose option 3 |

### Reading `install-status.txt`

Every time the server starts, it writes a plain-text status file next to the
installed EXE — i.e. inside whatever folder was chosen on the wizard's
"Select Destination Location" page, which is **not always Program Files**.
Use the **Start Menu → Aadhirai Pharma → "View Install Status"** shortcut to
open it directly without needing to know the path (there's also an "Open
Install Folder" shortcut next to it). For a source install or when running
the exe manually, it's written next to wherever the exe was launched from.

- **Success** looks like: `Successfully installed / started.` with the URL the app is serving on.
- **Failure** includes the full error — most commonly a database connection
  problem (wrong password, PostgreSQL service not running) or a port already
  in use. Paste this content when asking for support; it's the fastest way
  to diagnose an install issue remotely.

### App does not start / service fails (source installs)

```bash
# Run manually to see errors directly in the console
npm start
```
Check that `.env` exists and `DATABASE_URL` is correct.

---

## 📁 Project Structure (deployment-relevant files)

```
├── setup.bat              ← First-time full source install (dev machines)
├── seed-db.bat            ← Standalone DB schema + seed
├── update.bat              ← Pull + rebuild + restart (source installs)
├── uninstall.bat            ← Remove Windows Service (source installs)
├── build-installer.bat    ← Build server.exe + Setup.exe
├── pkg-config.json        ← Minimal config for pkg (assets only — see note above)
├── .env.example           ← Config template (copy → .env)
├── deploy/
│   ├── installer.iss          ← Inno Setup script for the client installer
│   ├── setup-service.js       ← Windows Service manager (source installs)
│   └── create-database.sql    ← Manual DB creation script
└── server/
    ├── index.ts            ← Express entry point, writes install-status.txt
    ├── storage.ts          ← DB connection + initializeDatabase() (bootstraps all tables)
    └── seed.ts             ← Seed script source
```

---

## 📞 Support

For issues contact the development team. When reporting an installer/startup
problem, please include the contents of `install-status.txt` (see
[Troubleshooting](#-troubleshooting)) — it usually contains the exact error.
