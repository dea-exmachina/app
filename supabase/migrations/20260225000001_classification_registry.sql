-- [admin] Schema classification registry + platform instance tracking
-- Phase 1.1 — Schema Propagation Pipeline infrastructure
-- Applies to: dea-exmachina-admin (hehldpjqlxhshdqqadng)
-- Created: 2026-02-25

BEGIN;

-- =============================================================================
-- 1. TABLE CLASSIFICATION REGISTRY
-- Every table in the admin DB classified as: product | admin | platform-seed
-- The propagation pipeline reads this to decide what flows to user DBs.
-- =============================================================================

CREATE TABLE IF NOT EXISTS _table_classification (
  table_name        TEXT PRIMARY KEY,
  classification    TEXT NOT NULL CHECK (classification IN ('product', 'admin', 'platform-seed')),
  multi_tenant_key  TEXT,   -- 'user_id' | 'via:project_id' | 'via:card_id' | 'platform-wide' etc.
  notes             TEXT,
  updated_at        TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE _table_classification IS
  'Classification registry for all admin DB tables. Drives schema propagation pipeline. admin = never propagate; product = propagate to all user DBs; platform-seed = propagate as read-only seed data.';

-- =============================================================================
-- 2. INSTANCE REGISTRY
-- Platform-level registry of all connected user databases.
-- Tracks schema version, migration access level, and health state.
-- =============================================================================

CREATE TABLE IF NOT EXISTS instance_registry (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL,
  instance_type         TEXT NOT NULL CHECK (instance_type IN ('managed-shared', 'managed-dedicated', 'byo')),
  supabase_project_id   TEXT NOT NULL UNIQUE,
  supabase_region       TEXT,
  schema_version        TEXT NOT NULL DEFAULT '0.0.0',
  last_migration        TEXT,
  migration_access      TEXT NOT NULL CHECK (migration_access IN ('full', 'cli-only', 'manual')),
  status                TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('provisioning', 'active', 'suspended', 'deactivated')),
  health_checked_at     TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS instance_registry_user_id_idx ON instance_registry (user_id);
CREATE INDEX IF NOT EXISTS instance_registry_status_idx  ON instance_registry (status);

COMMENT ON TABLE instance_registry IS
  'Registry of all user database instances connected to the platform. Tracks schema version and migration access mode.';

COMMENT ON COLUMN instance_registry.migration_access IS
  'full = platform applies migrations directly; cli-only = dea CLI applies on user machine; manual = user applies via dashboard/SQL export';

-- =============================================================================
-- 3. PLATFORM MIGRATION LOG
-- Immutable audit trail of every migration applied to every user DB.
-- =============================================================================

CREATE TABLE IF NOT EXISTS migration_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id         UUID NOT NULL REFERENCES instance_registry(id) ON DELETE CASCADE,
  migration_version   TEXT NOT NULL,
  migration_name      TEXT NOT NULL,
  applied_by          TEXT NOT NULL CHECK (applied_by IN ('platform-auto', 'cli', 'manual')),
  status              TEXT NOT NULL CHECK (status IN ('success', 'failed', 'rolled-back')),
  duration_ms         INTEGER,
  error_message       TEXT,
  applied_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS migration_log_instance_id_idx    ON migration_log (instance_id);
CREATE INDEX IF NOT EXISTS migration_log_applied_at_idx     ON migration_log (applied_at DESC);
CREATE INDEX IF NOT EXISTS migration_log_migration_name_idx ON migration_log (migration_name);

COMMENT ON TABLE migration_log IS
  'Immutable audit log of all schema migrations applied to all user DB instances. Never updated — append only.';

-- =============================================================================
-- 4. TIMESTAMP TRIGGER FOR INSTANCE REGISTRY
-- =============================================================================

CREATE OR REPLACE FUNCTION _update_instance_registry_updated_at()
  RETURNS trigger LANGUAGE plpgsql AS
$$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_instance_registry_updated_at ON instance_registry;
CREATE TRIGGER trg_instance_registry_updated_at
  BEFORE UPDATE ON instance_registry
  FOR EACH ROW EXECUTE FUNCTION _update_instance_registry_updated_at();

COMMIT;
