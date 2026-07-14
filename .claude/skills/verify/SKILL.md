---
name: verify
description: How to run and drive this app (Express + Vite + Postgres) against a scratch database to verify changes end-to-end.
---

# Verifying aadhirai-pharma-os changes

React + Express + Drizzle + Postgres, session-cookie auth. `.env` points at the
developer's real dev DB — **never boot verification runs against it**; startup
runs `initializeDatabase()` + seeds + migrations that mutate the DB.

## Scratch DB + server

```powershell
# Take the postgres password from DATABASE_URL in .env — never hardcode it.
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"   # psql is NOT on PATH
$env:PGPASSWORD = '<password from .env>'
& $psql -U postgres -h localhost -c "CREATE DATABASE verify_scratch;"

# env vars override .env; PORT default is 5000
$env:DATABASE_URL = "postgresql://postgres:$($env:PGPASSWORD)@localhost:5432/verify_scratch"
$env:PORT='5599'
npm run dev          # run in background; ready when log shows "serving on port"
```

Fresh boot seeds 4 users (password `password123` for all): `owner` (full
access), `pharmacist`, `cashier`, `admin` (deliberately limited; staff tier +
"Pharmacy Owner" menu role).

## Driving the API

Login establishes a session cookie; keep it with `-SessionVariable` /
`-WebSession`:

```powershell
Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post `
  -Body (@{username='owner';password='password123'}|ConvertTo-Json) `
  -ContentType 'application/json' -SessionVariable s
Invoke-RestMethod -Uri "$base/api/me/menus" -WebSession $s
```

Useful probes: `/api/me/menus` (menu access resolution), `/api/users`,
`/api/admin/roles` (owner-tier only, 403 otherwise), `/api/audit-logs`
(owner only), POST `/api/stock-adjustments` (owner/admin/pharmacist guard —
403 for cashier, 400-on-empty-body means the role guard passed).

## Gotchas

- **Unmatched routes return 200 with the SPA's index.html in dev** (Vite
  middleware catch-all), even for PUT/POST. A malformed URL in a probe can
  look like a false success — always print the parsed IDs/URL you built.
- PowerShell 5.1 `Where-Object prop -eq val` on Invoke-RestMethod results can
  fail to filter (member enumeration); use `Where-Object { $_.prop -eq val } |
  Select-Object -First 1` and echo the value before using it in a URL.
- Kill the server via the port, not the npm task:
  `(Get-NetTCPConnection -LocalPort 5599 -State Listen).OwningProcess | Stop-Process -Force`
- Restarting the server against the same DB is the way to test startup
  migrations/seeds for idempotency (all are designed to run every boot).
- Pre-existing `npm run check` errors exist on main (nullable batchNumber in
  Inventory/NewSale/Reports pages, etc.) — don't attribute them to the diff.
