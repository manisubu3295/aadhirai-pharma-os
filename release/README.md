# Aadhirai Pharma Management System

Pharmacy management software — runs fully **offline** on Windows.  
Access from any computer on the same network using a web browser.

---

## 📥 Installation (New Computer)

### What you need first

Install **PostgreSQL** before running the setup:  
👉 https://www.postgresql.org/download/windows

During PostgreSQL installation, you will be asked to set a **password** for the `postgres` user.  
**Write this password down** — you will need it during the Aadhirai Pharma setup.

---

### Step 1 — Download the installer

Download `AadhiraiPharma-Setup-v1.0.0.exe` from this folder.

---

### Step 2 — Run as Administrator

1. Right-click `AadhiraiPharma-Setup-v1.0.0.exe`
2. Select **"Run as administrator"**
3. Click **Yes** if Windows asks for permission

---

### Step 3 — Follow the wizard

The wizard will ask:

| Question | What to enter |
|----------|--------------|
| Database name | Leave as `medora_shivalaya` (or type your own) |
| Application port | Leave as `3000` and click Next |
| PostgreSQL password | The password you set when installing PostgreSQL |

Click **Install** and wait about 2 minutes.

---

### Step 4 — Check it started correctly

Open **Start Menu → Aadhirai Pharma → "View Install Status"** to confirm
installation succeeded. (Use this shortcut instead of typing a path — the
wizard lets you install to any folder you like, not just Program Files, so
there's no single fixed location to point you to. "Open Install Folder" is
also in the Start Menu group if you need to browse the folder itself.)

It says **"Successfully installed / started"** if everything is working. If
it instead shows an error, see [Troubleshooting](#-troubleshooting) below —
that file always contains the exact reason.

---

### Step 5 — Open the app

After installation completes:
- A **Desktop shortcut** named "Aadhirai Pharma" will appear
- Double-click it to open the app in your browser
- Or go to: **http://localhost:3000**

---

## 🔑 Login Credentials

> ⚠️ Change these passwords immediately after first login!

| Role | Username | Password |
|------|----------|----------|
| Owner / Admin | `owner` | `password123` |
| Pharmacist | `pharmacist` | `password123` |
| Cashier | `cashier` | `password123` |

---

## 🖥 Accessing from Other Computers

On any computer connected to the **same Wi-Fi or LAN**:

1. Open a web browser (Chrome, Edge, Firefox)
2. Type the server PC's IP address, e.g.: `http://192.168.1.10:3000`

To find your server's IP address:
- Open **Command Prompt** on the server PC
- Type `ipconfig` and press Enter
- Look for **IPv4 Address** under your network adapter

---

## 🔄 Updating

Download the latest `AadhiraiPharma-Setup-v1.0.0.exe` from this folder and run it again.  
It will update the existing installation automatically.

---

## ❌ Uninstalling

Go to **Windows Settings → Apps → Aadhirai Pharma → Uninstall**

---

## 🛠 Troubleshooting

| Problem | What to do |
|---------|-----------|
| App won't open | First check `install-status.txt` (see Step 4 above) for the exact error. Then press `Win + R`, type `services.msc`, find **AadhiraiPharma**, click **Start** |
| "Database connection error" | In `services.msc`, start **postgresql-x64-18** (or whichever version you installed) |
| Other computers can't connect | Make sure all computers are on the same Wi-Fi/LAN |
| Forgot your password | Ask the Owner account user to reset it in Settings → User Management |

> When contacting support about an install problem, please copy the full
> contents of `install-status.txt` — it's the fastest way for support to
> diagnose the issue without needing remote access to your computer.

---

## 📞 Support

Contact your IT support or the development team for help.
