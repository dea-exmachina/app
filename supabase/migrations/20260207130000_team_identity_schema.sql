-- DEA-082: Team/Identity Schema Migration
-- Migration: 20260207130000_team_identity_schema
-- Creates: supervisor_lenses, identity_project_context, identity_recommendations
-- Modifies: bender_teams, bender_identities

-- ============================================================================
-- TABLE: supervisor_lenses
-- 5 SWARM constructs
-- ============================================================================
CREATE TABLE IF NOT EXISTS supervisor_lenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lens TEXT UNIQUE NOT NULL
    CHECK (lens IN ('strategic', 'tactical', 'operational', 'social', 'meta')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE supervisor_lenses ENABLE ROW LEVEL SECURITY;
-- Policy: Allow all for authenticated and service_role (standard pattern in this repo)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'supervisor_lenses' AND policyname = 'Allow all for authenticated'
  ) THEN
    CREATE POLICY "Allow all for authenticated" ON supervisor_lenses
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'supervisor_lenses' AND policyname = 'Allow all for service role'
  ) THEN
    CREATE POLICY "Allow all for service role" ON supervisor_lenses
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- MODIFY: bender_teams
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bender_teams' AND column_name = 'slug') THEN
    ALTER TABLE bender_teams ADD COLUMN slug TEXT;
    ALTER TABLE bender_teams ADD CONSTRAINT bender_teams_slug_key UNIQUE (slug);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bender_teams' AND column_name = 'display_name') THEN
    ALTER TABLE bender_teams ADD COLUMN display_name TEXT;
  END IF;
END $$;

-- ============================================================================
-- MODIFY: bender_identities
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bender_identities' AND column_name = 'slug') THEN
    ALTER TABLE bender_identities ADD COLUMN slug TEXT;
    ALTER TABLE bender_identities ADD CONSTRAINT bender_identities_slug_key UNIQUE (slug);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bender_identities' AND column_name = 'display_name') THEN
    ALTER TABLE bender_identities ADD COLUMN display_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bender_identities' AND column_name = 'profile') THEN
    ALTER TABLE bender_identities ADD COLUMN profile JSONB DEFAULT '{}';
  END IF;
END $$;

-- ============================================================================
-- TABLE: identity_project_context
-- ============================================================================
CREATE TABLE IF NOT EXISTS identity_project_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id UUID REFERENCES bender_identities(id) ON DELETE CASCADE,
  project_id UUID REFERENCES nexus_projects(id) ON DELETE CASCADE,
  context JSONB DEFAULT '{}',
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(identity_id, project_id)
);

ALTER TABLE identity_project_context ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'identity_project_context' AND policyname = 'Allow all for authenticated'
  ) THEN
    CREATE POLICY "Allow all for authenticated" ON identity_project_context
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'identity_project_context' AND policyname = 'Allow all for service role'
  ) THEN
    CREATE POLICY "Allow all for service role" ON identity_project_context
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- TABLE: identity_recommendations
-- ============================================================================
CREATE TABLE IF NOT EXISTS identity_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES nexus_cards(id) ON DELETE CASCADE,
  identity_id UUID REFERENCES bender_identities(id) ON DELETE CASCADE,
  score NUMERIC,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_identity_recommendations_task ON identity_recommendations(task_id);

ALTER TABLE identity_recommendations ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'identity_recommendations' AND policyname = 'Allow all for authenticated'
  ) THEN
    CREATE POLICY "Allow all for authenticated" ON identity_recommendations
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'identity_recommendations' AND policyname = 'Allow all for service role'
  ) THEN
    CREATE POLICY "Allow all for service role" ON identity_recommendations
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ============================================================================
-- SEED: supervisor_lenses
-- ============================================================================
INSERT INTO supervisor_lenses (lens, description) VALUES
  ('strategic', 'Long-term goals, alignment, and vision.'),
  ('tactical', 'Immediate steps, methods, and execution plans.'),
  ('operational', 'Resource management, efficiency, and blockers.'),
  ('social', 'Team dynamics, communication, and morale.'),
  ('meta', 'Learning, process improvement, and architectural integrity.')
ON CONFLICT (lens) DO NOTHING;
