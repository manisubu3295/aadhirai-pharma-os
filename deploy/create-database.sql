-- ============================================================
-- Aadhirai Pharma — Database Bootstrap Script
-- Run this ONCE on a fresh PostgreSQL installation
-- Usage: psql -U postgres -f deploy/create-database.sql
-- ============================================================

-- Create the database (skip if already exists)
SELECT 'CREATE DATABASE aadhirai_pharma'
WHERE NOT EXISTS (
    SELECT FROM pg_database WHERE datname = 'aadhirai_pharma'
)\gexec

-- Create a dedicated app user (optional but recommended)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'pharma_app') THEN
        CREATE ROLE pharma_app WITH LOGIN PASSWORD 'pharma_secure_2025';
        GRANT ALL PRIVILEGES ON DATABASE aadhirai_pharma TO pharma_app;
        RAISE NOTICE 'User pharma_app created.';
    ELSE
        RAISE NOTICE 'User pharma_app already exists, skipping.';
    END IF;
END
$$;

\echo '--------------------------------------------'
\echo 'Database ready. Now run: npm run db:push'
\echo '--------------------------------------------'
