-- CC-114: Add framework_ids column to nexus_cards
-- NEX-133: Add framework_hint column to bender_tasks
-- Applied to dev + prod via MCP (2026-02-21)

-- 1. nexus_framework_id enum (33 canonical IDs from frameworks/library-v01.md)
DO $$ BEGIN
  CREATE TYPE nexus_framework_id AS ENUM (
    'ogsm', 'pre-mortem', 'working-backwards', 'rice',
    'tdd', 'separation-of-concerns', 'integration-first', 'progressive-enhancement',
    'pyramid-principle', 'scqa', 'documentation-as-code',
    'design-thinking', 'visual-first', 'atomic-design',
    'first-principles', 'swot', 'inversion', 'second-order-thinking', 'jtbd',
    'stoic-control', 'occams-razor', 'via-negativa',
    'raci', 'capability-mapping', 'tuckman',
    'rfc', 'retrospective', 'decision-log',
    'five-whys', 'issue-trees', 'constraint-analysis', 'cynefin',
    'hive-team-construction'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. framework_ids column on nexus_cards
ALTER TABLE nexus_cards
  ADD COLUMN IF NOT EXISTS framework_ids nexus_framework_id[] DEFAULT NULL;

-- 3. framework_hint column on bender_tasks
ALTER TABLE bender_tasks
  ADD COLUMN IF NOT EXISTS framework_hint text DEFAULT NULL;

COMMENT ON COLUMN nexus_cards.framework_ids IS
  'Canonical framework IDs from frameworks/library-v01.md applied to this card';

COMMENT ON COLUMN bender_tasks.framework_hint IS
  'Suggested framework ID for the bender to apply (from frameworks/library-v01.md)';
