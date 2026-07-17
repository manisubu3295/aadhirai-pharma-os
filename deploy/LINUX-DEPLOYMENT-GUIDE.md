# Aadhirai Pharma — Linux / Cloud Server Installation Guide

This is the guide for deploying on a Linux cloud server (e.g. a VPS) behind
a domain name, managed by PM2 — as opposed to the Windows on-premise
installer covered in [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md). Use this
guide for a client accessed over the internet at a real domain/subdomain
(for example `shanthi.aadhiraiinnovations.com`) rather than a pharmacy's
own local network.

## What you're installing

```
[Cloud server]
  ├── PostgreSQL (the database)
  ├── Node.js + this app, run from source, managed by PM2
  │     (PM2 restarts it automatically on crash or reboot)
  └── nginx — reverse proxy, terminates HTTPS (Let's Encrypt),
        forwards to the app on 127.0.0.1:3000

Client's browser  →  https://shanthi.aadhiraiinnovations.com  →  nginx  →  app (port 3000)
```

Assumes a fresh Ubuntu 22.04/24.04 server with root or sudo access, and
that you already control DNS for `aadhirai innovations.com` (so you can
point the subdomain's A record at the server's IP).

---

## Step 1 — DNS

Before anything else, create an **A record** for `shanthi` pointing at the
server's public IP address, in whatever DNS provider hosts
`aadhiraiinnovations.com`. DNS propagation can take a few minutes to a few
hours — do this first so it's ready by the time you need it in Step 6.

Verify once it's propagated:
```bash
dig +short shanthi.aadhiraiinnovations.com
```
should print the server's IP.

---

## Step 2 — Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version   # should print v20.x
```

---

## Step 3 — PostgreSQL

```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

Create the database and a password for the `postgres` user:
```bash
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'CHOOSE_A_STRONG_PASSWORD';"
sudo -u postgres createdb aadhirai_pharma
```
Write the password down — it goes into `.env` in Step 5.

`pg_dump`/`pg_restore` (used by the app's Backup feature) come from the
`postgresql-client` package, already installed as a dependency of
`postgresql` above — nothing extra needed.

---

## Step 4 — Clone the code

```bash
cd /opt
sudo git clone https://github.com/manisubu3295/aadhirai-pharma-os.git shanthi
cd shanthi
sudo git checkout shanthi
sudo chown -R $USER:$USER /opt/shanthi
```

The `shanthi` branch is a dedicated branch for this client's deployment —
future updates for this install get pushed there specifically, the same
way the Windows installer tracks the `release` branch.

---

## Step 5 — Configure `.env`

```bash
cp .env.example .env
nano .env
```
Fill in:
```
DATABASE_URL=postgresql://postgres:CHOOSE_A_STRONG_PASSWORD@localhost:5432/aadhirai_pharma
NODE_ENV=production
PORT=3000
SESSION_SECRET=<any long random string>
```
Generate a random `SESSION_SECRET` with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 6 — Install dependencies and build

```bash
npm install
npm run build
```
This produces `dist/index.cjs` (server) and `dist/public/` (client) — the
same build the Windows installer packages, just run directly instead of
compiled into a standalone exe.

---

## Step 7 — Run with PM2

```bash
sudo npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup    # prints a command — copy/paste and run it as instructed,
                # this makes PM2 (and the app) survive a server reboot
```

Verify it's up:
```bash
pm2 status
curl -s http://localhost:3000/api/health
```
should return `{"status":"healthy",...}`.

Useful commands going forward:
```bash
pm2 logs aadhirai-pharma       # tail logs
pm2 restart aadhirai-pharma    # after pulling new code + rebuilding
pm2 stop aadhirai-pharma
```

---

## Step 8 — nginx reverse proxy + HTTPS

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/shanthi`:
```nginx
server {
    listen 80;
    server_name shanthi.aadhiraiinnovations.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/shanthi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Then get a free TLS certificate (this also rewrites the nginx config above
to redirect HTTP → HTTPS automatically):
```bash
sudo certbot --nginx -d shanthi.aadhiraiinnovations.com
```

The app already trusts the `X-Forwarded-Proto` header nginx sends
(`trust proxy` is enabled in production), so login sessions and secure
cookies work correctly through the proxy without any extra app config.

---

## Step 9 — Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # 80 + 443
sudo ufw enable
```
Do **not** open port 3000 externally — only nginx (on 80/443) should be
reachable from the internet; it talks to the app over localhost.

---

## First login

Open `https://shanthi.aadhiraiinnovations.com` and sign in with the
default seeded accounts:
- **support** / `password123` — full access, for your team
- **admin** / `admin123` — the client's day-to-day login

Change both passwords from Settings → User Management once you're in.
Walk the client through creating their medicines/customers/doctor
structure, then once they're ready to go live, use **Settings → Reset**
(support login only) to clear the demo invoices and restart billing at #1.

---

## Deploying updates later

```bash
cd /opt/shanthi
git pull origin shanthi
npm install
npm run build
pm2 restart aadhirai-pharma
```

---

## Troubleshooting

- **`pm2 status` shows the app repeatedly restarting** — run `pm2 logs
  aadhirai-pharma --lines 100` and check for a `DATABASE_URL`/connection
  error (wrong password, PostgreSQL not running) or a missing `.env`.
- **502 Bad Gateway from nginx** — the app isn't running or isn't
  listening on port 3000; check `pm2 status` and `PORT` in `.env` match.
- **Login works but keeps logging you out** — confirm `certbot` succeeded
  and the site loads over `https://`, not `http://`; secure cookies
  require HTTPS in production.
- **`pg_dump not found` when using Backup/Reset Invoices in Settings** —
  confirm `postgresql-client` is installed (`which pg_dump`); it ships
  with the `postgresql` package installed in Step 3.
