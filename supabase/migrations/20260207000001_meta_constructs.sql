-- META Constructs — Governance layer entities (TASK-021)
-- Migration: 20260207000001_meta_constructs
-- Creates: meta_constructs table with seed data

-- ============================================================================
-- TABLE: meta_constructs
-- Governance-layer entities that sit above the operational layer.
-- These are not benders — they are authority models (lenses).
-- ============================================================================
CREATE TABLE meta_constructs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('supreme', 'subsystem_master')),
  authority TEXT[] NOT NULL,
  expertise TEXT[] NOT NULL,
  spec_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE meta_constructs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON meta_constructs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for service role" ON meta_constructs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- SEED: Initial META construct hierarchy
-- ============================================================================
INSERT INTO meta_constructs (entity, module, tier, authority, expertise, spec_path) VALUES
  (
    'Kerrigan',
    'THE_SWARM',
    'supreme',
    ARRAY['strategy', 'arbitration', 'meta-framework', 'delegation policy'],
    ARRAY['cross-domain synthesis', 'system evolution'],
    'identity/swarm/kerrigan.md'
  ),
  (
    'Architect',
    'HIVE',
    'subsystem_master',
    ARRAY['team composition', 'identity lifecycle', 'capability management'],
    ARRAY['org design', 'team topology', 'talent density'],
    'identity/swarm/architect.md'
  ),
  (
    'Abathur',
    'EVOLUTION',
    'subsystem_master',
    ARRAY['standards', 'compliance', 'knowledge', 'feedback loops'],
    ARRAY['quality engineering', 'pattern extraction'],
    'identity/swarm/abathur.md'
  ),
  (
    'Zagara',
    'CREEP',
    'subsystem_master',
    ARRAY['external systems', 'sync', 'event pipeline', 'agent health'],
    ARRAY['integration architecture', 'boundary discipline'],
    'identity/swarm/zagara.md'
  ),
  (
    'Keeper',
    'VAULT',
    'subsystem_master',
    ARRAY['logging', 'data', 'docs', 'dashboards', 'audit', 'META maintenance'],
    ARRAY['data custodianship', 'schema governance'],
    'identity/swarm/keeper.md'
  );
