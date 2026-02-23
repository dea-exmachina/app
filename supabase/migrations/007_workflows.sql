-- Workflows table for dea-exmachina workflow registry
-- Migration: 007_workflows.sql
-- Source: Migrating from GitHub markdown (workflows/public/*.md) to Supabase

CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('goal', 'explicit', 'goal-oriented')),
  trigger TEXT NOT NULL,
  skill TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated')),
  created TEXT NOT NULL,
  purpose TEXT NOT NULL,
  file_path TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]',
  prerequisites JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);

-- Index for skill linking
CREATE INDEX IF NOT EXISTS idx_workflows_skill ON workflows(skill);

-- RLS policies
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated users
CREATE POLICY "Workflows are viewable by authenticated users"
  ON workflows FOR SELECT
  TO authenticated
  USING (true);

-- Read access for anon (public read)
CREATE POLICY "Workflows are publicly readable"
  ON workflows FOR SELECT
  TO anon
  USING (true);

-- Write access for service role only
CREATE POLICY "Workflows are writable by service role"
  ON workflows FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_workflows_updated_at();
