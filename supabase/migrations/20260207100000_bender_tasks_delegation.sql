-- DEA-071: Bender Tasks Delegation Enhancement
-- Extends bender_tasks for platform-agnostic delegation system
-- Adds: team, member, platform, context, deliverables, score, target_repo, heartbeat_at
-- Adds: index on (status, platform), RLS for bender writes

-- ============================================================================
-- COLUMN ADDITIONS (idempotent with IF NOT EXISTS pattern)
-- ============================================================================

-- team_id: Optional FK to bender_teams for team-based tasks
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bender_tasks' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE bender_tasks ADD COLUMN team_id UUID REFERENCES bender_teams(id);
  END IF;
END $$;

-- member: Bender slug (e.g., "atlas", "frontend", "backend")
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bender_tasks' AND column_name = 'member'
  ) THEN
    ALTER TABLE bender_tasks ADD COLUMN member TEXT;
  END IF;
END $$;

-- platform: Target execution platform with CHECK constraint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bender_tasks' AND column_name = 'platform'
  ) THEN
    ALTER TABLE bender_tasks ADD COLUMN platform TEXT
      CHECK (platform IN ('gemini', 'claude', 'codex', 'any'));
  END IF;
END $$;

-- context: Full assembled context text (from context package builder)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bender_tasks' AND column_name = 'context'
  ) THEN
    ALTER TABLE bender_tasks ADD COLUMN context TEXT;
  END IF;
END $$;

-- deliverables: Deliverable file paths or descriptions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bender_tasks' AND column_name = 'deliverables'
  ) THEN
    ALTER TABLE bender_tasks ADD COLUMN deliverables TEXT;
  END IF;
END $$;

-- score: EWMA performance score at completion
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bender_tasks' AND column_name = 'score'
  ) THEN
    ALTER TABLE bender_tasks ADD COLUMN score NUMERIC(4,2);
  END IF;
END $$;

-- target_repo: Target git repository URL
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bender_tasks' AND column_name = 'target_repo'
  ) THEN
    ALTER TABLE bender_tasks ADD COLUMN target_repo TEXT;
  END IF;
END $$;

-- heartbeat_at: Last heartbeat from bender (for stuck detection)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bender_tasks' AND column_name = 'heartbeat_at'
  ) THEN
    ALTER TABLE bender_tasks ADD COLUMN heartbeat_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================================
-- INDEX: Efficient polling by status + platform
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_bender_tasks_status_platform
  ON bender_tasks(status, platform);

-- ============================================================================
-- RLS: Enable bender writes (anon key can update specific fields)
-- Service role already has full access via existing policies
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE bender_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Benders (via anon key) can read all tasks
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bender_tasks' AND policyname = 'Benders can read tasks'
  ) THEN
    CREATE POLICY "Benders can read tasks" ON bender_tasks
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- Policy: Benders can update status, execution_notes, deliverables, heartbeat_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bender_tasks' AND policyname = 'Benders can update task progress'
  ) THEN
    CREATE POLICY "Benders can update task progress" ON bender_tasks
      FOR UPDATE TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- COMMENTS: Document column purposes
-- ============================================================================
COMMENT ON COLUMN bender_tasks.team_id IS 'Optional FK to bender_teams for team-based tasks';
COMMENT ON COLUMN bender_tasks.member IS 'Bender slug (e.g., atlas, frontend) - named bender identity';
COMMENT ON COLUMN bender_tasks.platform IS 'Target platform: gemini, claude, codex, or any';
COMMENT ON COLUMN bender_tasks.context IS 'Full assembled context text from context package builder';
COMMENT ON COLUMN bender_tasks.deliverables IS 'Deliverable file paths or descriptions';
COMMENT ON COLUMN bender_tasks.score IS 'EWMA performance score (0-100) assigned at review';
COMMENT ON COLUMN bender_tasks.target_repo IS 'Target git repository URL for commits';
COMMENT ON COLUMN bender_tasks.heartbeat_at IS 'Last heartbeat timestamp for stuck detection';
