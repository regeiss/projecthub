-- =============================================================================
-- ProjectHub - Database bootstrap
-- PostgreSQL 16
--
-- This script must stay safe for a brand-new cluster:
--   - extensions
--   - schemas
--   - idempotent, database-level bootstrap only
--
-- Application tables, triggers, seed data, and views belong to Django
-- migrations executed by the api container.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

CREATE SCHEMA IF NOT EXISTS keycloak;

-- Keep this file intentionally small. Anything that depends on app tables must
-- be created from Django migrations after `python manage.py migrate`.
