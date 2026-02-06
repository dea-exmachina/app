-- Inbox items table for dea-exmachina inbox system
-- Migration: 010_inbox_items.sql
-- Source: Migrating from GitHub files (inbox/dea-box/*.md) to Supabase

CREATE TABLE IF NOT EXISTS inbox_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('note', 'link', 'file', 'instruction')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done')),
  created TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'webapp',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for status filtering (common query pattern)
CREATE INDEX IF NOT EXISTS idx_inbox_items_status ON inbox_items(status);

-- Index for type filtering
CREATE INDEX IF NOT EXISTS idx_inbox_items_type ON inbox_items(type);

-- Index for created date ordering
CREATE INDEX IF NOT EXISTS idx_inbox_items_created ON inbox_items(created DESC);

-- RLS policies
ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated and anon
CREATE POLICY "Inbox items are publicly readable"
  ON inbox_items FOR SELECT
  TO anon, authenticated
  USING (true);

-- Write access for authenticated users
CREATE POLICY "Inbox items are writable by authenticated users"
  ON inbox_items FOR INSERT
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anon can also create items (webapp creates without auth)
CREATE POLICY "Inbox items are creatable by anon"
  ON inbox_items FOR INSERT
  TO anon
  WITH CHECK (true);

-- Delete access for authenticated and service role
CREATE POLICY "Inbox items are deletable by authenticated users"
  ON inbox_items FOR DELETE
  TO authenticated, service_role
  USING (true);

-- Service role has full access
CREATE POLICY "Inbox items full access for service role"
  ON inbox_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_inbox_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inbox_items_updated_at
  BEFORE UPDATE ON inbox_items
  FOR EACH ROW
  EXECUTE FUNCTION update_inbox_items_updated_at();
