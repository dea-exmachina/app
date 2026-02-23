-- DEA-078: Model Routing Infrastructure
-- Creates routing_config, model_library, task_type_routing tables
-- Enables delegation to cheaper models based on task type

-- ============================================================================
-- routing_config: System-wide routing settings (key-value store)
-- ============================================================================
CREATE TABLE IF NOT EXISTS routing_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed routing config values
INSERT INTO routing_config (key, value, description) VALUES
  ('team_cap_per_project', '5', 'Max teams per project'),
  ('specialist_cap_per_team', '{"min": 3, "max": 5}', 'Specialist range per team'),
  ('escalation_score_threshold', '75', 'Score below which triggers escalation'),
  ('de_escalation_streak', '5', 'Consecutive high scores to try cheaper'),
  ('de_escalation_score_threshold', '90', 'Score above which counts toward streak'),
  ('retry_before_escalate', 'true', 'Retry same model once before escalating')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- model_library: Available models with cost tiers and capabilities
-- ============================================================================
CREATE TABLE IF NOT EXISTS model_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL,
  display_name TEXT NOT NULL,
  cost_tier INTEGER NOT NULL,
  strengths TEXT[],
  weaknesses TEXT[],
  capabilities TEXT[],
  is_active BOOLEAN DEFAULT true,
  escalates_to TEXT,  -- References slug, added as FK after insert
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed models (insert first, then add FK constraint)
INSERT INTO model_library (slug, provider, display_name, cost_tier, capabilities, escalates_to) VALUES
  ('gemini-2-flash', 'google', 'Gemini 2.0 Flash', 2, ARRAY['browser', 'fast', 'research'], 'gemini-2-pro'),
  ('gemini-2-pro', 'google', 'Gemini 2.0 Pro', 5, ARRAY['browser', 'code', 'reasoning'], 'claude-sonnet-4.5'),
  ('claude-sonnet-4.5', 'anthropic', 'Claude Sonnet 4.5', 7, ARRAY['code', 'reasoning', 'review'], 'claude-opus-4.5'),
  ('claude-opus-4.5', 'anthropic', 'Claude Opus 4.5', 9, ARRAY['governance', 'architecture'], NULL)
ON CONFLICT (slug) DO UPDATE SET
  provider = EXCLUDED.provider,
  display_name = EXCLUDED.display_name,
  cost_tier = EXCLUDED.cost_tier,
  capabilities = EXCLUDED.capabilities,
  escalates_to = EXCLUDED.escalates_to;

-- Add self-referential FK (after data exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'model_library_escalates_to_fkey'
  ) THEN
    ALTER TABLE model_library
      ADD CONSTRAINT model_library_escalates_to_fkey
      FOREIGN KEY (escalates_to) REFERENCES model_library(slug);
  END IF;
END $$;

-- ============================================================================
-- task_type_routing: Default model per task type
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_type_routing (
  task_type TEXT PRIMARY KEY,
  default_model TEXT REFERENCES model_library(slug),
  is_governance BOOLEAN DEFAULT false,
  description TEXT
);

-- Seed routing defaults
INSERT INTO task_type_routing (task_type, default_model, is_governance, description) VALUES
  ('research', 'gemini-2-flash', false, 'Investigation and research tasks'),
  ('documentation', 'gemini-2-flash', false, 'Doc writing and updates'),
  ('frontend', 'gemini-2-pro', false, 'UI/component implementation'),
  ('backend', 'gemini-2-pro', false, 'API/service implementation'),
  ('testing', 'gemini-2-pro', false, 'Test writing'),
  ('code-review', 'claude-sonnet-4.5', false, 'Code review'),
  ('debugging', 'claude-sonnet-4.5', false, 'Bug investigation'),
  ('architecture', 'claude-opus-4.5', true, 'System design'),
  ('governance', 'claude-opus-4.5', true, 'Meta-framework work'),
  ('council', 'claude-opus-4.5', true, 'Council-level decisions')
ON CONFLICT (task_type) DO UPDATE SET
  default_model = EXCLUDED.default_model,
  is_governance = EXCLUDED.is_governance,
  description = EXCLUDED.description;

-- ============================================================================
-- RLS Policies
-- ============================================================================
ALTER TABLE routing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_type_routing ENABLE ROW LEVEL SECURITY;

-- Read access for all authenticated + anon
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'routing_config_read') THEN
    CREATE POLICY "routing_config_read" ON routing_config FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'model_library_read') THEN
    CREATE POLICY "model_library_read" ON model_library FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'task_type_routing_read') THEN
    CREATE POLICY "task_type_routing_read" ON task_type_routing FOR SELECT USING (true);
  END IF;
END $$;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE routing_config IS 'System-wide routing configuration (key-value store)';
COMMENT ON TABLE model_library IS 'Available AI models with cost tiers and escalation paths';
COMMENT ON TABLE task_type_routing IS 'Default model routing per task type';

COMMENT ON COLUMN model_library.cost_tier IS 'Relative cost tier (1=cheapest, 10=most expensive)';
COMMENT ON COLUMN model_library.escalates_to IS 'Model slug to escalate to on failure';
COMMENT ON COLUMN task_type_routing.is_governance IS 'If true, task requires Claude-exclusive handling';
