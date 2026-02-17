-- Upgrade inbox_items table for project routing, priority, and richer metadata
-- Migration: 20260216_upgrade_inbox_items.sql
-- Card: NEXUS-055

-- Add project routing
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES nexus_projects(id) ON DELETE SET NULL;

-- Add priority
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('critical', 'high', 'normal', 'low'));

-- Add archived status to the type system
-- (Don't alter existing CHECK — just add the column for archive state)
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Add metadata for extensibility
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Add processed tracking
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS processed_at timestamptz;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_inbox_items_status_created ON inbox_items (status, created DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_items_project ON inbox_items (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inbox_items_priority ON inbox_items (priority) WHERE priority IN ('critical', 'high');

-- Ensure RLS is enabled (idempotent)
ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, recreate
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow authenticated read" ON inbox_items;
  DROP POLICY IF EXISTS "Allow authenticated insert" ON inbox_items;
  DROP POLICY IF EXISTS "Allow authenticated update" ON inbox_items;
  DROP POLICY IF EXISTS "Allow authenticated delete" ON inbox_items;
END $$;

CREATE POLICY "Allow authenticated read" ON inbox_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON inbox_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON inbox_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete" ON inbox_items FOR DELETE TO authenticated USING (true);
