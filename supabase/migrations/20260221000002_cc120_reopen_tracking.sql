-- CC-120: Add reopen tracking to nexus_cards and bender regression flag to bender_tasks

-- nexus_cards: reopen tracking
ALTER TABLE nexus_cards
  ADD COLUMN IF NOT EXISTS reopen_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reopen_type text CHECK (reopen_type IN ('bug_fix', 'scope_change')),
  ADD COLUMN IF NOT EXISTS reopen_reason text;

-- bender_tasks: regression tracking
ALTER TABLE bender_tasks
  ADD COLUMN IF NOT EXISTS regression boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS regression_count integer NOT NULL DEFAULT 0;

-- Index for fast bender regression queries (Abathur EWMA scoring)
-- Note: bender_tasks uses 'member' column (not 'bender_slug') for bender identity
CREATE INDEX IF NOT EXISTS idx_bender_tasks_regression
  ON bender_tasks(member, regression)
  WHERE regression = true;
