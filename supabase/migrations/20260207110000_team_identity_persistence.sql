-- DEA-074: Team & Identity Persistence
-- Extends bender_identities with brief + learnings
-- Creates bender_team_members junction table
-- Seeds existing teams (webapp-build, kerrigan-build)

-- ============================================================================
-- EXTEND bender_identities
-- ============================================================================

-- brief: Structured identity brief (capabilities, constraints, patterns)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bender_identities' AND column_name = 'brief'
  ) THEN
    ALTER TABLE bender_identities ADD COLUMN brief JSONB DEFAULT '{}';
  END IF;
END $$;

-- learnings: Accumulated learnings from task execution
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bender_identities' AND column_name = 'learnings'
  ) THEN
    ALTER TABLE bender_identities ADD COLUMN learnings TEXT;
  END IF;
END $$;

-- updated_at for tracking changes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bender_identities' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE bender_identities ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

COMMENT ON COLUMN bender_identities.brief IS 'Structured identity brief: capabilities, constraints, patterns, preferences';
COMMENT ON COLUMN bender_identities.learnings IS 'Accumulated learnings from task execution and feedback';

-- ============================================================================
-- CREATE bender_team_members junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS bender_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES bender_teams(id) ON DELETE CASCADE,
  identity_id UUID REFERENCES bender_identities(id) ON DELETE SET NULL,
  role TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('antigravity', 'claude', 'codex', 'any')),
  sequencing TEXT,
  context_file TEXT,
  is_dea_led BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, role)
);

CREATE INDEX IF NOT EXISTS idx_bender_team_members_team ON bender_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_bender_team_members_identity ON bender_team_members(identity_id);

ALTER TABLE bender_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow all for authenticated" ON bender_team_members
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for service role" ON bender_team_members
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE bender_team_members IS 'Junction table linking teams to bender identities with role assignments';
COMMENT ON COLUMN bender_team_members.role IS 'Role name within the team (e.g., Frontend, Backend, Reviewer)';
COMMENT ON COLUMN bender_team_members.platform IS 'Default platform for this role';
COMMENT ON COLUMN bender_team_members.sequencing IS 'Phase/order in team workflow (e.g., Phase 0, Phase 2 parallel)';
COMMENT ON COLUMN bender_team_members.context_file IS 'Specific context file path for this role';
COMMENT ON COLUMN bender_team_members.is_dea_led IS 'True if this role is led by dea, not a bender';

-- ============================================================================
-- SEED: webapp-build team
-- ============================================================================

-- First ensure the team exists
INSERT INTO bender_teams (name, branch_strategy, sequencing)
VALUES (
  'webapp-build',
  'main ← dev ← feature/{role}-{feature}',
  'Phase 0: Research → Phase 1: Architecture (dea) → Phase 2: Implement (parallel) → Phase 3: Review → Phase 4: Test'
)
ON CONFLICT (name) DO UPDATE SET
  branch_strategy = EXCLUDED.branch_strategy,
  sequencing = EXCLUDED.sequencing;

-- Add team members
INSERT INTO bender_team_members (team_id, role, platform, sequencing, context_file, is_dea_led)
SELECT
  (SELECT id FROM bender_teams WHERE name = 'webapp-build'),
  role, platform, sequencing, context_file, is_dea_led
FROM (VALUES
  ('Researcher', 'antigravity', 'Phase 0', 'benders/context/task-types/research.md', false),
  ('Architecture Lead', NULL, 'Phase 1', NULL, true),
  ('Frontend', 'claude', 'Phase 2 (parallel)', 'benders/context/task-types/webapp-frontend.md', false),
  ('Backend', 'claude', 'Phase 2 (parallel)', 'benders/context/task-types/webapp-backend.md', false),
  ('Reviewer', 'claude', 'Phase 3', 'benders/context/task-types/webapp-review.md', false),
  ('Tester', 'claude', 'Phase 4', 'benders/context/task-types/webapp-testing.md', false)
) AS t(role, platform, sequencing, context_file, is_dea_led)
ON CONFLICT (team_id, role) DO UPDATE SET
  platform = EXCLUDED.platform,
  sequencing = EXCLUDED.sequencing,
  context_file = EXCLUDED.context_file,
  is_dea_led = EXCLUDED.is_dea_led;

-- ============================================================================
-- SEED: kerrigan-build (THE SWARM build) team
-- ============================================================================

INSERT INTO bender_teams (name, branch_strategy, sequencing)
VALUES (
  'kerrigan-build',
  'main ← dev ← feature/{role}-{feature}',
  'Phase 0: Architecture (dea) → Phase 1: Core Infra → Phase 2-3: Integration + Standards (parallel) → Phase 4: Review (dea)'
)
ON CONFLICT (name) DO UPDATE SET
  branch_strategy = EXCLUDED.branch_strategy,
  sequencing = EXCLUDED.sequencing;

INSERT INTO bender_team_members (team_id, role, platform, sequencing, context_file, is_dea_led)
SELECT
  (SELECT id FROM bender_teams WHERE name = 'kerrigan-build'),
  role, platform, sequencing, context_file, is_dea_led
FROM (VALUES
  ('Architecture Lead', NULL, 'Phase 0', NULL, true),
  ('Systems Architect', 'claude', 'Phase 1', 'benders/context/shared/systems-architect.md', false),
  ('Integration Engineer', 'claude', 'Phase 2 (parallel)', 'benders/context/shared/integration-engineer.md', false),
  ('Standards Engineer', 'claude', 'Phase 3 (parallel)', 'benders/context/shared/standards-engineer.md', false),
  ('Frontend Engineer', 'claude', 'Phase 2+ (parallel)', 'benders/context/shared/frontend-engineer.md', false),
  ('UX Engineer', 'claude', 'Phase 2+ (parallel)', 'benders/context/shared/ux-engineer.md', false),
  ('Integration Review', NULL, 'Phase 4', NULL, true)
) AS t(role, platform, sequencing, context_file, is_dea_led)
ON CONFLICT (team_id, role) DO UPDATE SET
  platform = EXCLUDED.platform,
  sequencing = EXCLUDED.sequencing,
  context_file = EXCLUDED.context_file,
  is_dea_led = EXCLUDED.is_dea_led;

-- ============================================================================
-- UPDATE: Add slug column to bender_teams if missing
-- ============================================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bender_teams' AND column_name = 'slug'
  ) THEN
    ALTER TABLE bender_teams ADD COLUMN slug TEXT UNIQUE;
  END IF;
END $$;

-- Set slugs for existing teams
UPDATE bender_teams SET slug = 'webapp-build' WHERE name = 'webapp-build' AND slug IS NULL;
UPDATE bender_teams SET slug = 'kerrigan-build' WHERE name = 'kerrigan-build' AND slug IS NULL;

-- Add unique constraint on name if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bender_teams_name_key'
  ) THEN
    ALTER TABLE bender_teams ADD CONSTRAINT bender_teams_name_key UNIQUE (name);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
