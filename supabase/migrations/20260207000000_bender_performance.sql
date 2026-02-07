-- Bender Performance — Scoring and EWMA tracking (TASK-021)
-- Migration: 20260207000000_bender_performance
-- Creates: bender_performance table
-- Alters: bender_identities (adds roster/lineage columns)

-- ============================================================================
-- TABLE: bender_performance
-- Per-task scoring with EWMA snapshots for bender quality tracking.
-- ============================================================================
CREATE TABLE bender_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bender_name TEXT NOT NULL,
  bender_slug TEXT NOT NULL,
  task_id TEXT NOT NULL,
  identity TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  ewma_snapshot NUMERIC(5,2),
  deductions JSONB,
  level TEXT CHECK (level IN ('exemplary', 'solid', 'needs_work', 'rework')),
  reviewed_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by TEXT DEFAULT 'dea'
);

CREATE INDEX idx_bender_performance_slug_reviewed
  ON bender_performance(bender_slug, reviewed_at);

ALTER TABLE bender_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON bender_performance
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for service role" ON bender_performance
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- ALTER: bender_identities
-- Add roster and lineage columns for persistent bender tracking.
-- ============================================================================
ALTER TABLE bender_identities
  ADD COLUMN IF NOT EXISTS bender_name TEXT;

ALTER TABLE bender_identities
  ADD COLUMN IF NOT EXISTS bender_slug TEXT;

ALTER TABLE bender_identities
  ADD COLUMN IF NOT EXISTS lineage TEXT;

ALTER TABLE bender_identities
  ADD COLUMN IF NOT EXISTS retired_at TIMESTAMPTZ;

ALTER TABLE bender_identities
  ADD COLUMN IF NOT EXISTS retired_reason TEXT;
