# Aadhirai Pharma — Support Team Installation & Troubleshooting Guide

This is a step-by-step playbook for a support technician installing the app
on a pharmacy's own computer, from a blank machine to a working login. For a
shorter quick-reference version, see [README.md](README.md) in this same
folder — this document goes deeper on each step and on troubleshooting.

No screenshots are included here (this environment can't capture native
Windows installer dialogs) — every step instead names the exact field,
button, or checkbox you'll see, in the order you'll see it.

## What you're installing

```
[Pharmacy PC — runs everything]              [Other till/counter PCs]
  ├── PostgreSQL (the database)     ←──  Browser only:
  ├── Aadhirai Pharma (self-contained,        http://<SERVER-IP>:3000
  │    no Node.js needed — bundled
  │    into the installer)
  └── Runs as a Windows Service —
       starts automatically, no one
       needs to "launch" it after reboot
```

One PC (the "server") runs the software and the database. Every other
computer in the pharmacy just opens a web browser and points it at the
server's address — nothing is installed on those.

---

## Step 1 — Install PostgreSQL (on the server PC only)

1. Download from **https://www.postgresql.org/download/windows** → click
   the Windows link → download the installer for version **15, 16, 17, or
   18** (any of these work; the app auto-detects whichever is present).
2. Run the downloaded installer.
3. Click through: **Installation Directory** (leave default) → **Select
   Components** (leave all checked — you want at least "PostgreSQL Server"
   and "Command Line Tools") → **Data Directory** (leave default).
4. **Password screen** — set a password for the `postgres` superuser.
   **Write this down.** You will type it into our installer in Step 3.
5. **Port** — leave as `5432` (the default our installer expects).
6. **Locale** — leave as default.
7. Finish the wizard. On the last screen it may offer to launch
   "Stack Builder" — you can skip/cancel that, it's not needed.
8. PostgreSQL installs itself as a Windows Service and starts automatically
   — there is nothing further to start manually.

**Verify it worked:** open Command Prompt and run:
```
"C:\Program Files\PostgreSQL\<version>\bin\psql.exe" -U postgres -h localhost
```
It should prompt for the password you set in step 4. If it connects, you're
done with this step. If `psql` isn't recognized, use the full path shown
above (PostgreSQL isn't always added to your system PATH, which is fine —
our installer finds it automatically either way).

---

## Step 2 — .NET Framework (usually already there — check only if the service fails)

The Windows Service that keeps the app running in the background (a
component called WinSW) needs **.NET Framework 4.0 or newer**. Windows 10
(1607+) and Windows 11 both ship with a compatible .NET Framework
pre-installed, so **on almost every real machine you can skip this step
entirely.**

Only act on this if, after Step 3, the install status shows the service
failed to start with a runtime/framework error:
1. Open **Settings → Apps → Optional Features → More Windows Features**
   (or search "Turn Windows features on or off").
2. Confirm **.NET Framework 4.8 Advanced Services** is checked. If not,
   check it and let Windows install it (may need a restart).
3. If that's unavailable on a very old/minimal Windows build, download the
   .NET Framework 4.8 installer directly from
   **https://dotnet.microsoft.com/download/dotnet-framework/net48** and run
   it.
4. Re-run `AadhiraiPharma-Setup-v1.0.0.exe` (Step 3) — it's safe to run
   again on the same machine.

---

## Step 3 — Run the Aadhirai Pharma installer

1. Get `AadhiraiPharma-Setup-v1.0.0.exe` from the project's `release`
   branch and copy it to the server PC.
2. Right-click it → **Run as administrator** (required — it registers a
   Windows Service). Click **Yes** on the Windows prompt.
3. **Select Destination Location** — pick any folder, or accept the
   default. Remember this if you ever need to browse the install folder
   directly.
4. **Database Name** page — a text box defaulting to `medora_shivalaya`.
   Leave it as-is unless you have a specific reason to name it differently.
   If a database with that name already exists on this PostgreSQL server,
   the installer reuses it as-is (your existing data is safe) — tables and
   default users are only created for a brand-new database.
5. **Application Port** page — defaults to `3000`. Leave it unless that
   port is already in use by something else on this PC.
6. **PostgreSQL Password** page — enter the `postgres` password from
   Step 1.4.
7. Click through the remaining pages and let it install (roughly 1–2
   minutes). Behind the scenes it writes a `.env` config file, creates the
   database if needed, installs the Windows Service, and waits for the
   service to report it's actually running (not just "install commanded" —
   it polls for up to 60 seconds) before letting you finish.
8. **If this pharmacy has more than one till/counter PC**, open an elevated
   Command Prompt now and add a firewall rule so those other computers can
   reach the server (the installer doesn't do this automatically):
   ```
   netsh advfirewall firewall add rule name="AadhiraiPharma" dir=in action=allow protocol=TCP localport=3000
   ```
   (replace `3000` with whatever port you chose in step 5).
9. On the final page, check **"Open Aadhirai Pharma in browser"** (checked
   by default) and click **Finish**.

---

## Step 4 — Confirm it's actually running

The install folder isn't always Program Files (you chose it in Step 3.3),
so don't hunt for it manually:

- **Start Menu → Aadhirai Pharma → "View Install Status"** opens
  `install-status.txt` directly. It says either **"Successfully installed /
  started"** with the URL the app is serving on, or the exact error if
  something's wrong (most often: wrong PostgreSQL password, PostgreSQL
  service not running, or the port already in use).
- **Start Menu → Aadhirai Pharma → "Open Install Folder"** browses there
  directly if you need the other diagnostic files (see Troubleshooting).

---

## Step 5 — First login

Open the app (Desktop shortcut, or `http://localhost:3000` on the server
PC itself). Four accounts are seeded by default:

| Username | Password | Access |
|---|---|---|
| `support` | `password123` | Everything — use this for support/admin work |
| `admin` | `admin123` | A curated default set of menus (adjust anytime in Role Master) |
| `pharmacist` | `password123` | Inventory + dispensing |
| `cashier` | `password123` | Billing only |

**Change every one of these passwords immediately** — log in, go to
**Settings → User Management**, and reset each password (or delete/recreate
accounts as needed for this pharmacy's actual staff).

**From any other computer in the pharmacy:** open a browser and go to
`http://<SERVER-IP>:3000`. Find the server's IP by running `ipconfig` on
the server PC and reading the **IPv4 Address**.

---

## Uninstalling

**Windows Settings → Apps → Aadhirai Pharma → Uninstall.** This stops and
removes the Windows Service. It does **not** delete the PostgreSQL
database or your data, and if you added a firewall rule manually in
Step 3.8, that isn't removed either — clean those up separately if you
genuinely want to wipe everything (`netsh advfirewall firewall delete rule
name="AadhiraiPharma"`).

---

## Troubleshooting

Always start with **`install-status.txt`** (Step 4) — it usually names the
exact problem. If it's empty or missing, the service may not have started
at all yet; check **`installer-debug.txt`** and **`setup-log.txt`** in the
same install folder, which record what the installer's post-install script
actually did (or where it failed before the app ever got a chance to write
its own status).

| Symptom | What to check |
|---|---|
| App won't open in browser | `install-status.txt` first. Then Start → `services.msc` → confirm **AadhiraiPharma** shows Running. |
| "Cannot connect to database" | `services.msc` → confirm **postgresql-x64-\<version\>** is Running. Re-check the password you entered in Step 3.6 — a typo there is the most common cause of a failed first install. |
| Service shows in `services.msc` but is Stopped | Check `AadhiraiPharmaService.err.log` in the install folder for the crash reason. The service is configured to auto-restart on failure, so also just wait ~10–30 seconds and re-check. |
| Installer said the service didn't report "running" within 60 seconds | Not necessarily broken — PostgreSQL can be slow to accept connections right after a reboot. Wait a minute and re-check `install-status.txt`; the service has automatic restart-on-failure. |
| "PostgreSQL not found" during install | PostgreSQL isn't installed, or was installed to a non-standard location. Install it per Step 1 (versions 15–18 only are auto-detected, in `C:\Program Files\PostgreSQL\<version>\bin`). |
| Other computers can't reach it | The packaged installer does **not** add a Windows Firewall rule automatically (only the source-based `install.bat` does). Add one manually — open an elevated Command Prompt and run: `netsh advfirewall firewall add rule name="AadhiraiPharma" dir=in action=allow protocol=TCP localport=3000` (use your actual port from Step 3.5). Confirm every device is on the same Wi-Fi/LAN. |
| Login "succeeds" but immediately looks logged out | Only seen when accessing over a LAN IP (not `localhost`) with a very old install. Open `.env` in the install folder and confirm `SESSION_COOKIE_SECURE=false` — every install built from the current installer sets this automatically, so this points to a stale/manually-edited install. |
| Forgot a password | Log in as `support` (or any other still-known full-access login) → **Settings → User Management** → reset the password. If no account is accessible at all, this needs direct database access — contact the development team. |
| Port already in use | Edit `.env` in the install folder, change `PORT=3000` to an unused number, then restart the service: Start Menu → Aadhirai Pharma → **Stop Service**, then **Start Service**. |
| Need to re-run database setup manually | `deploy\create-database.sql` in the install folder can create the database by hand (`psql -U postgres -f deploy\create-database.sql`) if the automatic step ever needs to be redone — the app itself creates all its tables on next startup regardless. |

When escalating an install issue, always attach the contents of
`install-status.txt` (and `installer-debug.txt`/`setup-log.txt` if the app
never got as far as writing its own status) — between them they cover
nearly every failure mode from "PostgreSQL unreachable" to "the installer's
post-install script never ran".

---

## For developers (source-based setup)

If you're working from the git repository rather than the packaged
installer, see the **"For Developers"** section of the root `README.md`
on the project's `main` branch — it covers `setup.bat`, `npm run dev`,
building the installer with `build-installer.bat`, and the underlying
database commands.
