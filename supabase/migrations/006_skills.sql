-- Skills table for dea-exmachina skill registry
-- Migration: 006_skills.sql
-- Source: Migrating from GitHub markdown (tools/dea-skilllist.md) to Supabase

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('meta', 'identity', 'bender-management', 'session', 'content', 'development', 'professional')),
  workflow TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'planned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status);

-- RLS policies
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated users
CREATE POLICY "Skills are viewable by authenticated users"
  ON skills FOR SELECT
  TO authenticated
  USING (true);

-- Read access for anon (public read)
CREATE POLICY "Skills are publicly readable"
  ON skills FOR SELECT
  TO anon
  USING (true);

-- Write access for service role only
CREATE POLICY "Skills are writable by service role"
  ON skills FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_skills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW
  EXECUTE FUNCTION update_skills_updated_at();
