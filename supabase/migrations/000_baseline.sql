-- =============================================================================
-- 000_baseline.sql — Consolidated baseline migration
-- Exported from prod kerrigan (cpfhgisfkudoiajcoujx) on 2026-02-09
-- Applies complete schema to dev-kerrigan (hehldpjqlxhshdqqadng)
-- =============================================================================
-- This file supersedes all individual migration files (005–20260210*).
-- It represents the actual prod schema at time of export, not the cumulative
-- effect of running migrations sequentially (which would diverge).
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- =============================================================================
-- 2. FUNCTIONS (before tables — triggers reference these)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.nexus_update_timestamp()
  RETURNS trigger LANGUAGE plpgsql
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_arch_annotations_updated_at()
  RETURNS trigger LANGUAGE plpgsql
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_canvases_updated_at()
  RETURNS trigger LANGUAGE plpgsql
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_inbox_items_updated_at()
  RETURNS trigger LANGUAGE plpgsql
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_skills_updated_at()
  RETURNS trigger LANGUAGE plpgsql
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_workflows_updated_at()
  RETURNS trigger LANGUAGE plpgsql
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.nexus_generate_card_id()
  RETURNS trigger LANGUAGE plpgsql
AS $$ DECLARE prefix TEXT; num INTEGER; BEGIN IF NEW.card_id IS NULL OR NEW.card_id = '' THEN SELECT card_id_prefix, next_card_number INTO prefix, num FROM nexus_projects WHERE id = NEW.project_id FOR UPDATE; NEW.card_id := prefix || '-' || LPAD(num::TEXT, 3, '0'); UPDATE nexus_projects SET next_card_number = num + 1 WHERE id = NEW.project_id; END IF; RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.nexus_emit_card_created()
  RETURNS trigger LANGUAGE plpgsql
AS $$ BEGIN INSERT INTO nexus_events (event_type, card_id, actor, payload) VALUES ('card.created', NEW.id, COALESCE(current_setting('app.actor', true), 'system'), jsonb_build_object('card_id', NEW.card_id, 'lane', NEW.lane, 'title', NEW.title, 'card_type', NEW.card_type)); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.nexus_emit_card_event()
  RETURNS trigger LANGUAGE plpgsql
AS $$ BEGIN IF OLD.lane IS DISTINCT FROM NEW.lane THEN INSERT INTO nexus_events (event_type, card_id, actor, payload) VALUES ('card.moved', NEW.id, COALESCE(current_setting('app.actor', true), 'system'), jsonb_build_object('from_lane', OLD.lane, 'to_lane', NEW.lane, 'card_id', NEW.card_id)); END IF; IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN INSERT INTO nexus_events (event_type, card_id, actor, payload) VALUES ('card.assigned', NEW.id, COALESCE(current_setting('app.actor', true), 'system'), jsonb_build_object('from', OLD.assigned_to, 'to', NEW.assigned_to)); END IF; IF OLD.bender_lane IS DISTINCT FROM NEW.bender_lane THEN INSERT INTO nexus_events (event_type, card_id, actor, payload) VALUES ('card.bender_moved', NEW.id, COALESCE(current_setting('app.actor', true), 'system'), jsonb_build_object('from_bender_lane', OLD.bender_lane, 'to_bender_lane', NEW.bender_lane, 'card_id', NEW.card_id)); END IF; NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.nexus_card_completion()
  RETURNS trigger LANGUAGE plpgsql
AS $$ BEGIN IF NEW.lane = 'done' AND OLD.lane != 'done' THEN NEW.completed_at = COALESCE(NEW.completed_at, now()); END IF; RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.nexus_auto_lock()
  RETURNS trigger LANGUAGE plpgsql
AS $$ BEGIN IF NEW.lane = 'in_progress' AND OLD.lane != 'in_progress' AND NEW.assigned_to IS NOT NULL THEN INSERT INTO nexus_locks (lock_type, card_id, agent, target, expires_at) VALUES ('task', NEW.id, NEW.assigned_to, NEW.card_id, now() + interval '4 hours') ON CONFLICT DO NOTHING; END IF; IF NEW.lane IN ('review', 'done') AND OLD.lane NOT IN ('review', 'done') THEN UPDATE nexus_locks SET released_at = now() WHERE card_id = NEW.id AND lock_type = 'task' AND released_at IS NULL; END IF; RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.nexus_emit_comment_event()
  RETURNS trigger LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO nexus_events (event_type, card_id, actor, payload)
  VALUES (
    CASE WHEN NEW.is_pivot THEN 'comment.pivot' ELSE 'comment.added' END,
    NEW.card_id, NEW.author,
    jsonb_build_object(
      'comment_id', NEW.id,
      'type', NEW.comment_type,
      'is_pivot', NEW.is_pivot,
      'content_preview', LEFT(NEW.content, 200)
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.nexus_handle_pivot()
  RETURNS trigger LANGUAGE plpgsql
AS $$ BEGIN IF NEW.is_pivot = true AND NEW.pivot_impact = 'major' THEN UPDATE nexus_cards SET lane = 'review' WHERE id = NEW.card_id AND lane = 'in_progress'; END IF; RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.nexus_discord_comment_notify()
  RETURNS trigger LANGUAGE plpgsql
AS $$
DECLARE
  webhook_url TEXT;
  card_display_id TEXT;
  project_name TEXT;
  embed_color INTEGER;
  type_label TEXT;
  payload JSONB;
BEGIN
  IF NEW.comment_type NOT IN ('question', 'directive', 'rejection', 'review')
     AND NEW.is_pivot = false THEN
    RETURN NEW;
  END IF;

  SELECT nc.card_id, np.name, np.metadata->>'discord_webhook_url'
  INTO card_display_id, project_name, webhook_url
  FROM nexus_cards nc
  LEFT JOIN nexus_projects np ON nc.project_id = np.id
  WHERE nc.id = NEW.card_id;

  IF webhook_url IS NULL OR webhook_url = '' THEN
    RETURN NEW;
  END IF;

  embed_color := CASE NEW.comment_type
    WHEN 'question'  THEN 16760576
    WHEN 'directive'  THEN 3443387
    WHEN 'rejection'  THEN 15548997
    WHEN 'review'     THEN 5763719
    ELSE 8421504
  END;

  type_label := UPPER(NEW.comment_type);
  IF NEW.is_pivot THEN
    type_label := type_label || ' [PIVOT/' || UPPER(COALESCE(NEW.pivot_impact, 'minor')) || ']';
  END IF;

  payload := jsonb_build_object(
    'embeds', jsonb_build_array(
      jsonb_build_object(
        'title', type_label || ' on ' || COALESCE(card_display_id, 'unknown'),
        'description', LEFT(NEW.content, 500),
        'color', embed_color,
        'fields', jsonb_build_array(
          jsonb_build_object('name', 'Author', 'value', NEW.author, 'inline', true),
          jsonb_build_object('name', 'Card', 'value', COALESCE(card_display_id, 'N/A'), 'inline', true),
          jsonb_build_object('name', 'Board', 'value', COALESCE(project_name, 'N/A'), 'inline', true)
        ),
        'timestamp', to_char(NEW.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
    )
  );

  PERFORM net.http_post(
    url := webhook_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.nexus_emit_lock_event()
  RETURNS trigger LANGUAGE plpgsql
AS $$ BEGIN INSERT INTO nexus_events (event_type, card_id, actor, payload) VALUES ( CASE WHEN NEW.released_at IS NOT NULL THEN 'lock.released' ELSE 'lock.acquired' END, NEW.card_id, NEW.agent, jsonb_build_object('lock_type', NEW.lock_type, 'target', NEW.target) ); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.nexus_mark_context_stale()
  RETURNS trigger LANGUAGE plpgsql
AS $$ BEGIN UPDATE nexus_context_packages SET stale = true WHERE card_id = NEW.card_id AND stale = false; INSERT INTO nexus_events (event_type, card_id, actor, payload) VALUES ('context.stale', NEW.card_id, 'system', jsonb_build_object('reason', 'task_details_updated')); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.nexus_cleanup_expired_locks()
  RETURNS integer LANGUAGE plpgsql
AS $$ DECLARE released_count INTEGER; BEGIN UPDATE nexus_locks SET released_at = now() WHERE released_at IS NULL AND expires_at IS NOT NULL AND expires_at < now(); GET DIAGNOSTICS released_count = ROW_COUNT; RETURN released_count; END; $$;

CREATE OR REPLACE FUNCTION public.nexus_cleanup_expired_locks_rpc()
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
AS $$ DECLARE cnt INTEGER; BEGIN cnt := nexus_cleanup_expired_locks(); RETURN jsonb_build_object('released', cnt); END; $$;

-- =============================================================================
-- 3. TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_health (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  agent_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT DEFAULT 'unknown'::text,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  current_task TEXT,
  metrics JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS architecture_annotations (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_tier TEXT,
  annotation_type TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  priority TEXT DEFAULT 'normal'::text,
  resolved BOOLEAN DEFAULT false,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS architecture_secrets (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  component_id TEXT NOT NULL,
  component_type TEXT NOT NULL,
  variable_name TEXT NOT NULL,
  secret_type TEXT NOT NULL,
  description TEXT,
  required BOOLEAN DEFAULT true,
  location TEXT NOT NULL,
  status TEXT DEFAULT 'active'::text,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bender_identities (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  expertise TEXT[] NOT NULL,
  platforms TEXT[] NOT NULL,
  context_files TEXT[],
  system_prompt TEXT,
  project_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  display_name TEXT,
  bender_name TEXT,
  bender_slug TEXT,
  lineage TEXT,
  retired_at TIMESTAMPTZ,
  retired_reason TEXT,
  brief JSONB DEFAULT '{}'::jsonb,
  learnings TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  profile JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS bender_performance (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  bender_name TEXT NOT NULL,
  bender_slug TEXT NOT NULL,
  task_id TEXT NOT NULL,
  identity TEXT NOT NULL,
  score INTEGER NOT NULL,
  ewma_snapshot NUMERIC,
  deductions JSONB,
  level TEXT,
  reviewed_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by TEXT DEFAULT 'dea'::text
);

CREATE TABLE IF NOT EXISTS bender_platforms (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active'::text NOT NULL,
  interface TEXT,
  models TEXT[],
  cost_tier TEXT,
  strengths TEXT[],
  limitations TEXT[],
  config_location TEXT,
  context_directory TEXT
);

CREATE TABLE IF NOT EXISTS bender_tasks (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  project_id UUID NOT NULL,
  task_id TEXT NOT NULL,
  title TEXT NOT NULL,
  bender_role TEXT,
  status TEXT DEFAULT 'proposed'::text NOT NULL,
  priority TEXT DEFAULT 'normal'::text,
  branch TEXT,
  overview TEXT,
  requirements TEXT[],
  acceptance_criteria TEXT[],
  execution_notes TEXT,
  review_decision TEXT,
  review_feedback TEXT,
  markdown_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  team_id UUID,
  member TEXT,
  platform TEXT,
  context TEXT,
  deliverables TEXT,
  score NUMERIC,
  target_repo TEXT,
  heartbeat_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bender_team_members (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  team_id UUID NOT NULL,
  identity_id UUID,
  role TEXT NOT NULL,
  platform TEXT,
  sequencing TEXT,
  context_file TEXT,
  is_dea_led BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bender_teams (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  project_id UUID,
  name TEXT NOT NULL,
  sequencing TEXT,
  branch_strategy TEXT,
  markdown_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  members JSONB DEFAULT '[]'::jsonb NOT NULL,
  file_ownership JSONB DEFAULT '{}'::jsonb NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  slug TEXT,
  display_name TEXT
);

CREATE TABLE IF NOT EXISTS canvases (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  title TEXT DEFAULT 'Untitled'::text NOT NULL,
  description TEXT,
  data JSONB DEFAULT '{}'::jsonb NOT NULL,
  thumbnail TEXT,
  project_id UUID,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS project_templates (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  project_type TEXT NOT NULL,
  icon TEXT,
  dashboard_layout JSONB NOT NULL,
  suggested_benders JSONB,
  starter_workflows TEXT[],
  initial_data_schema JSONB,
  setup_questions JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  template_id UUID,
  status TEXT DEFAULT 'active'::text NOT NULL,
  dashboard_layout JSONB,
  repo_path TEXT,
  git_repo_url TEXT,
  vercel_project_id TEXT,
  vercel_team_id TEXT,
  supabase_project_id TEXT,
  supabase_branch_id TEXT,
  integrations JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity_project_context (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  identity_id UUID,
  project_id UUID,
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity_recommendations (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  task_id UUID,
  identity_id UUID,
  score NUMERIC,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inbox_items (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  filename TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending'::text NOT NULL,
  created TIMESTAMPTZ DEFAULT now() NOT NULL,
  source TEXT DEFAULT 'webapp'::text NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS kanban_boards (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  project_id UUID,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  lanes JSONB NOT NULL,
  markdown_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  handoff JSONB
);

CREATE TABLE IF NOT EXISTS kanban_cards (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  project_id UUID NOT NULL,
  board_id UUID NOT NULL,
  card_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  lane TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  position INTEGER,
  tags TEXT[] DEFAULT '{}'::text[],
  parent_card_id TEXT,
  source TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  raw_markdown TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  project_id UUID,
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  in_reply_to UUID,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meta_constructs (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  entity TEXT NOT NULL,
  module TEXT NOT NULL,
  tier TEXT NOT NULL,
  authority TEXT[] NOT NULL,
  expertise TEXT[] NOT NULL,
  spec_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS model_library (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  slug TEXT NOT NULL,
  provider TEXT NOT NULL,
  display_name TEXT NOT NULL,
  cost_tier INTEGER NOT NULL,
  strengths TEXT[],
  weaknesses TEXT[],
  capabilities TEXT[],
  is_active BOOLEAN DEFAULT true,
  escalates_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nexus_projects (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  delegation_policy TEXT DEFAULT 'delegation-first'::text NOT NULL,
  override_reason TEXT,
  protected_paths TEXT[],
  repo_url TEXT,
  card_id_prefix TEXT NOT NULL,
  next_card_number INTEGER DEFAULT 1 NOT NULL,
  color TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  group_slug TEXT,
  lane_config JSONB
);

CREATE TABLE IF NOT EXISTS nexus_cards (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  card_id TEXT DEFAULT ''::text NOT NULL,
  project_id UUID,
  parent_id UUID,
  lane TEXT NOT NULL,
  bender_lane TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  card_type TEXT NOT NULL,
  delegation_tag TEXT DEFAULT 'BENDER'::text NOT NULL,
  delegation_justification TEXT,
  assigned_to TEXT,
  assigned_model TEXT,
  priority TEXT DEFAULT 'normal'::text,
  source TEXT,
  tags TEXT[],
  subtasks JSONB DEFAULT '[]'::jsonb,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nexus_agent_sessions (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  agent TEXT NOT NULL,
  model TEXT,
  card_id UUID,
  status TEXT DEFAULT 'active'::text,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS nexus_comments (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  card_id UUID,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  comment_type TEXT DEFAULT 'note'::text,
  is_pivot BOOLEAN DEFAULT false,
  pivot_impact TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nexus_context_packages (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  card_id UUID,
  layers JSONB NOT NULL,
  assembled_files TEXT[],
  assembled_content TEXT,
  assembled_at TIMESTAMPTZ DEFAULT now(),
  stale BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS nexus_events (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  event_type TEXT NOT NULL,
  card_id UUID,
  actor TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nexus_locks (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  lock_type TEXT NOT NULL,
  card_id UUID,
  agent TEXT NOT NULL,
  target TEXT NOT NULL,
  acquired_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS nexus_task_details (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  card_id UUID,
  overview TEXT,
  requirements TEXT,
  acceptance_criteria TEXT,
  constraints TEXT,
  deliverables TEXT,
  "references" TEXT,
  branch TEXT DEFAULT 'dev'::text,
  declared_scope TEXT[],
  actual_scope TEXT[],
  context_package_id UUID,
  execution_notes TEXT,
  review_decision TEXT,
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_benders (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  project_id UUID NOT NULL,
  identity_id UUID NOT NULL,
  role TEXT,
  invocation TEXT,
  status TEXT DEFAULT 'active'::text,
  context_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS queen_events (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  actor TEXT,
  summary TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  trace_id UUID,
  project TEXT,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS routing_config (
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skills (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  workflow TEXT,
  status TEXT DEFAULT 'active'::text NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS supervisor_lenses (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  slug TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sync_state (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  internal_type TEXT NOT NULL,
  internal_id TEXT NOT NULL,
  sync_direction TEXT DEFAULT 'inbound'::text,
  status TEXT DEFAULT 'active'::text,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS task_type_routing (
  task_type TEXT NOT NULL,
  default_model TEXT,
  is_governance BOOLEAN DEFAULT false,
  description TEXT
);

CREATE TABLE IF NOT EXISTS user_learnings (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  project_id UUID,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  confidence NUMERIC DEFAULT 0.5,
  evidence_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_configs (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  source TEXT NOT NULL,
  endpoint_path TEXT NOT NULL,
  secret TEXT,
  enabled BOOLEAN DEFAULT true,
  transform_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflows (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  project_id UUID,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  workflow_type TEXT NOT NULL,
  trigger TEXT,
  status TEXT DEFAULT 'active'::text,
  purpose TEXT,
  sections JSONB,
  prerequisites TEXT[],
  markdown_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  name TEXT,
  skill TEXT,
  created TEXT,
  file_path TEXT
);

-- =============================================================================
-- 4. PRIMARY KEYS
-- =============================================================================

ALTER TABLE agent_health ADD CONSTRAINT agent_health_pkey PRIMARY KEY (id);
ALTER TABLE architecture_annotations ADD CONSTRAINT architecture_annotations_pkey PRIMARY KEY (id);
ALTER TABLE architecture_secrets ADD CONSTRAINT architecture_secrets_pkey PRIMARY KEY (id);
ALTER TABLE bender_identities ADD CONSTRAINT bender_identities_pkey PRIMARY KEY (id);
ALTER TABLE bender_performance ADD CONSTRAINT bender_performance_pkey PRIMARY KEY (id);
ALTER TABLE bender_platforms ADD CONSTRAINT bender_platforms_pkey PRIMARY KEY (id);
ALTER TABLE bender_tasks ADD CONSTRAINT bender_tasks_pkey PRIMARY KEY (id);
ALTER TABLE bender_team_members ADD CONSTRAINT bender_team_members_pkey PRIMARY KEY (id);
ALTER TABLE bender_teams ADD CONSTRAINT bender_teams_pkey PRIMARY KEY (id);
ALTER TABLE canvases ADD CONSTRAINT canvases_pkey PRIMARY KEY (id);
ALTER TABLE identity_project_context ADD CONSTRAINT identity_project_context_pkey PRIMARY KEY (id);
ALTER TABLE identity_recommendations ADD CONSTRAINT identity_recommendations_pkey PRIMARY KEY (id);
ALTER TABLE inbox_items ADD CONSTRAINT inbox_items_pkey PRIMARY KEY (id);
ALTER TABLE kanban_boards ADD CONSTRAINT kanban_boards_pkey PRIMARY KEY (id);
ALTER TABLE kanban_cards ADD CONSTRAINT kanban_cards_pkey PRIMARY KEY (id);
ALTER TABLE messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id);
ALTER TABLE meta_constructs ADD CONSTRAINT meta_constructs_pkey PRIMARY KEY (id);
ALTER TABLE model_library ADD CONSTRAINT model_library_pkey PRIMARY KEY (id);
ALTER TABLE nexus_agent_sessions ADD CONSTRAINT nexus_agent_sessions_pkey PRIMARY KEY (id);
ALTER TABLE nexus_cards ADD CONSTRAINT nexus_cards_pkey PRIMARY KEY (id);
ALTER TABLE nexus_comments ADD CONSTRAINT nexus_comments_pkey PRIMARY KEY (id);
ALTER TABLE nexus_context_packages ADD CONSTRAINT nexus_context_packages_pkey PRIMARY KEY (id);
ALTER TABLE nexus_events ADD CONSTRAINT nexus_events_pkey PRIMARY KEY (id);
ALTER TABLE nexus_locks ADD CONSTRAINT nexus_locks_pkey PRIMARY KEY (id);
ALTER TABLE nexus_projects ADD CONSTRAINT nexus_projects_pkey PRIMARY KEY (id);
ALTER TABLE nexus_task_details ADD CONSTRAINT nexus_task_details_pkey PRIMARY KEY (id);
ALTER TABLE project_benders ADD CONSTRAINT project_benders_pkey PRIMARY KEY (id);
ALTER TABLE project_templates ADD CONSTRAINT project_templates_pkey PRIMARY KEY (id);
ALTER TABLE projects ADD CONSTRAINT projects_pkey PRIMARY KEY (id);
ALTER TABLE queen_events ADD CONSTRAINT queen_events_pkey PRIMARY KEY (id);
ALTER TABLE routing_config ADD CONSTRAINT routing_config_pkey PRIMARY KEY (key);
ALTER TABLE skills ADD CONSTRAINT skills_pkey PRIMARY KEY (id);
ALTER TABLE supervisor_lenses ADD CONSTRAINT supervisor_lenses_pkey PRIMARY KEY (id);
ALTER TABLE sync_state ADD CONSTRAINT sync_state_pkey PRIMARY KEY (id);
ALTER TABLE task_type_routing ADD CONSTRAINT task_type_routing_pkey PRIMARY KEY (task_type);
ALTER TABLE user_learnings ADD CONSTRAINT user_learnings_pkey PRIMARY KEY (id);
ALTER TABLE webhook_configs ADD CONSTRAINT webhook_configs_pkey PRIMARY KEY (id);
ALTER TABLE workflows ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);

-- =============================================================================
-- 5. UNIQUE CONSTRAINTS
-- =============================================================================

ALTER TABLE agent_health ADD CONSTRAINT agent_health_agent_name_key UNIQUE (agent_name);
ALTER TABLE architecture_secrets ADD CONSTRAINT architecture_secrets_component_id_variable_name_key UNIQUE (component_id, variable_name);
ALTER TABLE bender_identities ADD CONSTRAINT bender_identities_slug_key UNIQUE (slug);
ALTER TABLE bender_platforms ADD CONSTRAINT bender_platforms_slug_key UNIQUE (slug);
ALTER TABLE bender_tasks ADD CONSTRAINT bender_tasks_project_id_task_id_key UNIQUE (project_id, task_id);
ALTER TABLE bender_team_members ADD CONSTRAINT bender_team_members_team_id_role_key UNIQUE (team_id, role);
ALTER TABLE bender_teams ADD CONSTRAINT bender_teams_name_key UNIQUE (name);
ALTER TABLE bender_teams ADD CONSTRAINT bender_teams_project_id_name_key UNIQUE (project_id, name);
ALTER TABLE bender_teams ADD CONSTRAINT bender_teams_slug_key UNIQUE (slug);
ALTER TABLE inbox_items ADD CONSTRAINT inbox_items_filename_key UNIQUE (filename);
ALTER TABLE kanban_boards ADD CONSTRAINT kanban_boards_project_id_slug_key UNIQUE (project_id, slug);
ALTER TABLE kanban_boards ADD CONSTRAINT kanban_boards_slug_key UNIQUE (slug);
ALTER TABLE kanban_cards ADD CONSTRAINT kanban_cards_project_id_card_id_key UNIQUE (project_id, card_id);
ALTER TABLE meta_constructs ADD CONSTRAINT meta_constructs_entity_key UNIQUE (entity);
ALTER TABLE model_library ADD CONSTRAINT model_library_slug_key UNIQUE (slug);
ALTER TABLE nexus_cards ADD CONSTRAINT nexus_cards_card_id_key UNIQUE (card_id);
ALTER TABLE nexus_projects ADD CONSTRAINT nexus_projects_slug_key UNIQUE (slug);
ALTER TABLE nexus_task_details ADD CONSTRAINT nexus_task_details_card_id_key UNIQUE (card_id);
ALTER TABLE project_benders ADD CONSTRAINT project_benders_project_id_identity_id_key UNIQUE (project_id, identity_id);
ALTER TABLE project_templates ADD CONSTRAINT project_templates_slug_key UNIQUE (slug);
ALTER TABLE projects ADD CONSTRAINT projects_slug_key UNIQUE (slug);
ALTER TABLE skills ADD CONSTRAINT skills_name_key UNIQUE (name);
ALTER TABLE supervisor_lenses ADD CONSTRAINT supervisor_lenses_slug_key UNIQUE (slug);
ALTER TABLE sync_state ADD CONSTRAINT sync_state_source_external_id_key UNIQUE (source, external_id);
ALTER TABLE user_learnings ADD CONSTRAINT user_learnings_project_id_category_key_key UNIQUE (project_id, category, key);
ALTER TABLE webhook_configs ADD CONSTRAINT webhook_configs_source_key UNIQUE (source);
ALTER TABLE workflows ADD CONSTRAINT workflows_project_id_slug_key UNIQUE (project_id, slug);

-- =============================================================================
-- 6. FOREIGN KEYS
-- =============================================================================

ALTER TABLE bender_tasks ADD CONSTRAINT bender_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE bender_tasks ADD CONSTRAINT bender_tasks_team_id_fkey FOREIGN KEY (team_id) REFERENCES bender_teams(id);
ALTER TABLE bender_team_members ADD CONSTRAINT bender_team_members_identity_id_fkey FOREIGN KEY (identity_id) REFERENCES bender_identities(id);
ALTER TABLE bender_team_members ADD CONSTRAINT bender_team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES bender_teams(id);
ALTER TABLE bender_teams ADD CONSTRAINT bender_teams_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE canvases ADD CONSTRAINT canvases_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE identity_project_context ADD CONSTRAINT identity_project_context_identity_id_fkey FOREIGN KEY (identity_id) REFERENCES bender_identities(id);
ALTER TABLE identity_project_context ADD CONSTRAINT identity_project_context_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE identity_recommendations ADD CONSTRAINT identity_recommendations_identity_id_fkey FOREIGN KEY (identity_id) REFERENCES bender_identities(id);
ALTER TABLE identity_recommendations ADD CONSTRAINT identity_recommendations_task_id_fkey FOREIGN KEY (task_id) REFERENCES nexus_cards(id);
ALTER TABLE kanban_boards ADD CONSTRAINT kanban_boards_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE kanban_cards ADD CONSTRAINT kanban_cards_board_id_fkey FOREIGN KEY (board_id) REFERENCES kanban_boards(id);
ALTER TABLE kanban_cards ADD CONSTRAINT kanban_cards_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE messages ADD CONSTRAINT messages_in_reply_to_fkey FOREIGN KEY (in_reply_to) REFERENCES messages(id);
ALTER TABLE messages ADD CONSTRAINT messages_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE model_library ADD CONSTRAINT model_library_escalates_to_fkey FOREIGN KEY (escalates_to) REFERENCES model_library(slug);
ALTER TABLE nexus_agent_sessions ADD CONSTRAINT nexus_agent_sessions_card_id_fkey FOREIGN KEY (card_id) REFERENCES nexus_cards(id);
ALTER TABLE nexus_cards ADD CONSTRAINT nexus_cards_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES nexus_cards(id);
ALTER TABLE nexus_cards ADD CONSTRAINT nexus_cards_project_id_fkey FOREIGN KEY (project_id) REFERENCES nexus_projects(id);
ALTER TABLE nexus_comments ADD CONSTRAINT nexus_comments_card_id_fkey FOREIGN KEY (card_id) REFERENCES nexus_cards(id);
ALTER TABLE nexus_context_packages ADD CONSTRAINT nexus_context_packages_card_id_fkey FOREIGN KEY (card_id) REFERENCES nexus_cards(id);
ALTER TABLE nexus_events ADD CONSTRAINT nexus_events_card_id_fkey FOREIGN KEY (card_id) REFERENCES nexus_cards(id);
ALTER TABLE nexus_locks ADD CONSTRAINT nexus_locks_card_id_fkey FOREIGN KEY (card_id) REFERENCES nexus_cards(id);
ALTER TABLE nexus_task_details ADD CONSTRAINT nexus_task_details_card_id_fkey FOREIGN KEY (card_id) REFERENCES nexus_cards(id);
ALTER TABLE nexus_task_details ADD CONSTRAINT fk_nexus_task_details_context_package FOREIGN KEY (context_package_id) REFERENCES nexus_context_packages(id);
ALTER TABLE project_benders ADD CONSTRAINT project_benders_identity_id_fkey FOREIGN KEY (identity_id) REFERENCES bender_identities(id);
ALTER TABLE project_benders ADD CONSTRAINT project_benders_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE projects ADD CONSTRAINT fk_projects_template FOREIGN KEY (template_id) REFERENCES project_templates(id);
ALTER TABLE task_type_routing ADD CONSTRAINT task_type_routing_default_model_fkey FOREIGN KEY (default_model) REFERENCES model_library(slug);
ALTER TABLE user_learnings ADD CONSTRAINT user_learnings_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE workflows ADD CONSTRAINT workflows_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id);

-- =============================================================================
-- 7. CHECK CONSTRAINTS
-- =============================================================================

ALTER TABLE agent_health ADD CONSTRAINT agent_health_status_check CHECK (status = ANY (ARRAY['active'::text, 'idle'::text, 'stuck'::text, 'offline'::text, 'unknown'::text]));
ALTER TABLE architecture_annotations ADD CONSTRAINT architecture_annotations_annotation_type_check CHECK (annotation_type = ANY (ARRAY['note'::text, 'suggestion'::text, 'task'::text, 'todo'::text, 'warning'::text]));
ALTER TABLE architecture_annotations ADD CONSTRAINT architecture_annotations_priority_check CHECK (priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'critical'::text]));
ALTER TABLE architecture_annotations ADD CONSTRAINT architecture_annotations_target_tier_check CHECK (target_tier = ANY (ARRAY['meta'::text, 'project'::text, 'infrastructure'::text]));
ALTER TABLE architecture_annotations ADD CONSTRAINT architecture_annotations_target_type_check CHECK (target_type = ANY (ARRAY['node'::text, 'variable'::text, 'connection'::text, 'workflow'::text, 'table'::text]));
ALTER TABLE architecture_secrets ADD CONSTRAINT architecture_secrets_component_type_check CHECK (component_type = ANY (ARRAY['infrastructure'::text, 'meta'::text, 'project'::text]));
ALTER TABLE architecture_secrets ADD CONSTRAINT architecture_secrets_location_check CHECK (location = ANY (ARRAY['vault'::text, 'webapp'::text, 'both'::text]));
ALTER TABLE architecture_secrets ADD CONSTRAINT architecture_secrets_secret_type_check CHECK (secret_type = ANY (ARRAY['API_KEY'::text, 'TOKEN'::text, 'URL'::text, 'UID_PW'::text, 'SECRET'::text, 'OTHER'::text]));
ALTER TABLE architecture_secrets ADD CONSTRAINT architecture_secrets_status_check CHECK (status = ANY (ARRAY['active'::text, 'deprecated'::text, 'planned'::text]));
ALTER TABLE bender_identities ADD CONSTRAINT bender_identities_expertise_check CHECK ((array_length(expertise, 1) >= 1) AND (array_length(expertise, 1) <= 4));
ALTER TABLE bender_performance ADD CONSTRAINT bender_performance_level_check CHECK (level = ANY (ARRAY['exemplary'::text, 'solid'::text, 'needs_work'::text, 'rework'::text]));
ALTER TABLE bender_performance ADD CONSTRAINT bender_performance_score_check CHECK ((score >= 0) AND (score <= 100));
ALTER TABLE bender_platforms ADD CONSTRAINT bender_platforms_cost_tier_check CHECK (cost_tier = ANY (ARRAY['cheap'::text, 'expensive'::text, 'TBD'::text]));
ALTER TABLE bender_platforms ADD CONSTRAINT bender_platforms_status_check CHECK (status = ANY (ARRAY['active'::text, 'planned'::text, 'archived'::text]));
ALTER TABLE bender_tasks ADD CONSTRAINT bender_tasks_platform_check CHECK (platform = ANY (ARRAY['gemini'::text, 'claude'::text, 'codex'::text, 'any'::text]));
ALTER TABLE bender_tasks ADD CONSTRAINT bender_tasks_priority_check CHECK (priority = ANY (ARRAY['focus'::text, 'normal'::text]));
ALTER TABLE bender_tasks ADD CONSTRAINT bender_tasks_status_check CHECK (status = ANY (ARRAY['proposed'::text, 'executing'::text, 'delivered'::text, 'integrated'::text]));
ALTER TABLE bender_team_members ADD CONSTRAINT bender_team_members_platform_check CHECK (platform = ANY (ARRAY['antigravity'::text, 'claude'::text, 'codex'::text, 'any'::text]));
ALTER TABLE inbox_items ADD CONSTRAINT inbox_items_status_check CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'done'::text]));
ALTER TABLE inbox_items ADD CONSTRAINT inbox_items_type_check CHECK (type = ANY (ARRAY['note'::text, 'link'::text, 'file'::text, 'instruction'::text]));
ALTER TABLE messages ADD CONSTRAINT messages_sender_check CHECK (sender = ANY (ARRAY['user'::text, 'dea'::text]));
ALTER TABLE meta_constructs ADD CONSTRAINT meta_constructs_tier_check CHECK (tier = ANY (ARRAY['supreme'::text, 'subsystem_master'::text]));
ALTER TABLE nexus_agent_sessions ADD CONSTRAINT nexus_agent_sessions_status_check CHECK (status = ANY (ARRAY['active'::text, 'idle'::text, 'completed'::text]));
ALTER TABLE nexus_cards ADD CONSTRAINT nexus_cards_bender_lane_check CHECK (bender_lane = ANY (ARRAY['proposed'::text, 'queued'::text, 'executing'::text, 'delivered'::text, 'integrated'::text]));
ALTER TABLE nexus_cards ADD CONSTRAINT nexus_cards_card_type_check CHECK (card_type = ANY (ARRAY['epic'::text, 'task'::text, 'bug'::text, 'chore'::text, 'research'::text, 'article'::text]));
ALTER TABLE nexus_cards ADD CONSTRAINT nexus_cards_delegation_tag_check CHECK (delegation_tag = ANY (ARRAY['BENDER'::text, 'DEA'::text]));
ALTER TABLE nexus_cards ADD CONSTRAINT nexus_cards_lane_check CHECK (lane = ANY (ARRAY['backlog'::text, 'ready'::text, 'in_progress'::text, 'review'::text, 'done'::text, 'ideas'::text, 'drafts'::text, 'unpublished'::text, 'published'::text, 'archive'::text]));
ALTER TABLE nexus_cards ADD CONSTRAINT nexus_cards_priority_check CHECK (priority = ANY (ARRAY['critical'::text, 'high'::text, 'normal'::text, 'low'::text]));
ALTER TABLE nexus_comments ADD CONSTRAINT nexus_comments_comment_type_check CHECK (comment_type = ANY (ARRAY['note'::text, 'pivot'::text, 'question'::text, 'directive'::text, 'delivery'::text, 'review'::text, 'rejection'::text]));
ALTER TABLE nexus_comments ADD CONSTRAINT nexus_comments_pivot_impact_check CHECK (pivot_impact = ANY (ARRAY['minor'::text, 'major'::text]));
ALTER TABLE nexus_locks ADD CONSTRAINT nexus_locks_lock_type_check CHECK (lock_type = ANY (ARRAY['task'::text, 'file'::text, 'scope'::text]));
ALTER TABLE nexus_projects ADD CONSTRAINT nexus_projects_delegation_policy_check CHECK (delegation_policy = ANY (ARRAY['dea-only'::text, 'delegation-first'::text]));
ALTER TABLE nexus_task_details ADD CONSTRAINT nexus_task_details_review_decision_check CHECK (review_decision = ANY (ARRAY['approved'::text, 'needs_refinement'::text, 'insufficient'::text]));
ALTER TABLE project_benders ADD CONSTRAINT project_benders_status_check CHECK (status = ANY (ARRAY['active'::text, 'paused'::text]));
ALTER TABLE project_templates ADD CONSTRAINT project_templates_project_type_check CHECK (project_type = ANY (ARRAY['software'::text, 'content'::text, 'life'::text, 'business'::text, 'hobby'::text, 'custom'::text]));
ALTER TABLE projects ADD CONSTRAINT projects_slug_check CHECK (slug ~ '^[a-z0-9-]+$'::text);
ALTER TABLE projects ADD CONSTRAINT projects_status_check CHECK (status = ANY (ARRAY['active'::text, 'paused'::text, 'archived'::text]));
ALTER TABLE projects ADD CONSTRAINT projects_type_check CHECK (type = ANY (ARRAY['software'::text, 'content'::text, 'life'::text, 'business'::text, 'hobby'::text, 'custom'::text]));
ALTER TABLE skills ADD CONSTRAINT skills_category_check CHECK (category = ANY (ARRAY['meta'::text, 'identity'::text, 'bender-management'::text, 'session'::text, 'content'::text, 'development'::text, 'professional'::text]));
ALTER TABLE skills ADD CONSTRAINT skills_status_check CHECK (status = ANY (ARRAY['active'::text, 'deprecated'::text, 'planned'::text]));
ALTER TABLE sync_state ADD CONSTRAINT sync_state_internal_type_check CHECK (internal_type = ANY (ARRAY['kanban_card'::text, 'bender_task'::text, 'project'::text]));
ALTER TABLE sync_state ADD CONSTRAINT sync_state_status_check CHECK (status = ANY (ARRAY['active'::text, 'stale'::text, 'conflict'::text, 'error'::text]));
ALTER TABLE sync_state ADD CONSTRAINT sync_state_sync_direction_check CHECK (sync_direction = ANY (ARRAY['inbound'::text, 'outbound'::text, 'bidirectional'::text]));
ALTER TABLE user_learnings ADD CONSTRAINT user_learnings_category_check CHECK (category = ANY (ARRAY['communication'::text, 'preferences'::text, 'voice'::text, 'workflow'::text, 'technical'::text, 'domain'::text]));
ALTER TABLE user_learnings ADD CONSTRAINT user_learnings_confidence_check CHECK ((confidence >= (0)::numeric) AND (confidence <= (1)::numeric));

-- =============================================================================
-- 8. INDEXES (non-constraint)
-- =============================================================================

CREATE INDEX idx_arch_annotations_priority ON architecture_annotations USING btree (priority) WHERE (priority = ANY (ARRAY['high'::text, 'critical'::text]));
CREATE INDEX idx_arch_annotations_resolved ON architecture_annotations USING btree (resolved) WHERE (NOT resolved);
CREATE INDEX idx_arch_annotations_target ON architecture_annotations USING btree (target_type, target_id);
CREATE INDEX idx_arch_annotations_type ON architecture_annotations USING btree (annotation_type);
CREATE INDEX idx_arch_secrets_component ON architecture_secrets USING btree (component_id);
CREATE INDEX idx_arch_secrets_location ON architecture_secrets USING btree (location);
CREATE INDEX idx_arch_secrets_status ON architecture_secrets USING btree (status);
CREATE INDEX idx_bender_performance_slug_reviewed ON bender_performance USING btree (bender_slug, reviewed_at);
CREATE INDEX idx_bender_tasks_priority ON bender_tasks USING btree (priority);
CREATE INDEX idx_bender_tasks_project_status ON bender_tasks USING btree (project_id, status);
CREATE INDEX idx_bender_tasks_status_platform ON bender_tasks USING btree (status, platform);
CREATE INDEX idx_bender_team_members_identity ON bender_team_members USING btree (identity_id);
CREATE INDEX idx_bender_team_members_team ON bender_team_members USING btree (team_id);
CREATE INDEX idx_canvases_updated_at ON canvases USING btree (updated_at DESC);
CREATE INDEX idx_identity_recommendations_task ON identity_recommendations USING btree (task_id);
CREATE INDEX idx_inbox_items_created ON inbox_items USING btree (created DESC);
CREATE INDEX idx_inbox_items_status ON inbox_items USING btree (status);
CREATE INDEX idx_inbox_items_type ON inbox_items USING btree (type);
CREATE INDEX idx_kanban_boards_project ON kanban_boards USING btree (project_id);
CREATE INDEX idx_kanban_cards_project_board ON kanban_cards USING btree (project_id, board_id);
CREATE INDEX idx_kanban_cards_project_status ON kanban_cards USING btree (project_id, completed);
CREATE INDEX idx_messages_project_created ON messages USING btree (project_id, created_at DESC);
CREATE INDEX idx_messages_reply_to ON messages USING btree (in_reply_to);
CREATE INDEX idx_messages_sender_read ON messages USING btree (sender, read);
CREATE INDEX idx_nexus_sessions_active ON nexus_agent_sessions USING btree (agent) WHERE (status = 'active'::text);
CREATE INDEX idx_nexus_cards_assigned ON nexus_cards USING btree (assigned_to);
CREATE INDEX idx_nexus_cards_bender ON nexus_cards USING btree (assigned_to) WHERE (bender_lane IS NOT NULL);
CREATE INDEX idx_nexus_cards_card_id ON nexus_cards USING btree (card_id);
CREATE INDEX idx_nexus_cards_parent ON nexus_cards USING btree (parent_id);
CREATE INDEX idx_nexus_cards_project ON nexus_cards USING btree (project_id);
CREATE INDEX idx_nexus_cards_project_lane ON nexus_cards USING btree (project_id, lane);
CREATE INDEX idx_nexus_comments_card ON nexus_comments USING btree (card_id);
CREATE INDEX idx_nexus_comments_pivot ON nexus_comments USING btree (card_id) WHERE (is_pivot = true);
CREATE INDEX idx_nexus_comments_unresolved ON nexus_comments USING btree (card_id) WHERE (resolved = false);
CREATE INDEX idx_nexus_events_card ON nexus_events USING btree (card_id);
CREATE INDEX idx_nexus_events_time ON nexus_events USING btree (created_at DESC);
CREATE INDEX idx_nexus_events_type ON nexus_events USING btree (event_type);
CREATE INDEX idx_nexus_locks_active ON nexus_locks USING btree (lock_type, target) WHERE (released_at IS NULL);
CREATE INDEX idx_nexus_locks_agent ON nexus_locks USING btree (agent) WHERE (released_at IS NULL);
CREATE INDEX idx_project_benders_identity ON project_benders USING btree (identity_id);
CREATE INDEX idx_project_benders_project ON project_benders USING btree (project_id);
CREATE INDEX idx_projects_status ON projects USING btree (status);
CREATE INDEX idx_projects_type ON projects USING btree (type);
CREATE INDEX idx_queen_events_created ON queen_events USING btree (created_at DESC);
CREATE INDEX idx_queen_events_project ON queen_events USING btree (project);
CREATE INDEX idx_queen_events_source ON queen_events USING btree (source);
CREATE INDEX idx_queen_events_trace ON queen_events USING btree (trace_id) WHERE (trace_id IS NOT NULL);
CREATE INDEX idx_queen_events_type ON queen_events USING btree (type);
CREATE INDEX idx_skills_category ON skills USING btree (category);
CREATE INDEX idx_skills_status ON skills USING btree (status);
CREATE INDEX idx_sync_state_internal ON sync_state USING btree (internal_type, internal_id);
CREATE INDEX idx_sync_state_source ON sync_state USING btree (source);
CREATE INDEX idx_user_learnings_category ON user_learnings USING btree (category);
CREATE INDEX idx_user_learnings_confidence ON user_learnings USING btree (confidence);
CREATE INDEX idx_user_learnings_project ON user_learnings USING btree (project_id);
CREATE INDEX idx_workflows_project ON workflows USING btree (project_id);
CREATE INDEX idx_workflows_skill ON workflows USING btree (skill);
CREATE INDEX idx_workflows_status ON workflows USING btree (status);

-- =============================================================================
-- 9. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE agent_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bender_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bender_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE bender_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bender_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bender_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bender_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_project_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_constructs ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_context_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_task_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_benders ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE queen_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_lenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_type_routing ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 10. RLS POLICIES
-- =============================================================================

-- agent_health
CREATE POLICY "Allow all for authenticated" ON agent_health FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON agent_health FOR ALL TO service_role USING (true) WITH CHECK (true);

-- architecture_annotations
CREATE POLICY "Annotations deletable by authenticated" ON architecture_annotations FOR DELETE TO authenticated USING (true);
CREATE POLICY "Annotations full access for service role" ON architecture_annotations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Annotations updatable by authenticated" ON architecture_annotations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Annotations viewable by authenticated" ON architecture_annotations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Annotations writable by authenticated" ON architecture_annotations FOR INSERT TO authenticated WITH CHECK (true);

-- architecture_secrets
CREATE POLICY "Secrets registry viewable by authenticated" ON architecture_secrets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Secrets registry writable by service role" ON architecture_secrets FOR ALL TO service_role USING (true) WITH CHECK (true);

-- bender_identities
CREATE POLICY "Single user full access" ON bender_identities FOR ALL TO public USING (true);

-- bender_performance
CREATE POLICY "Allow all for authenticated" ON bender_performance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON bender_performance FOR ALL TO service_role USING (true) WITH CHECK (true);

-- bender_platforms
CREATE POLICY "Single user full access" ON bender_platforms FOR ALL TO public USING (true);

-- bender_tasks
CREATE POLICY "Benders can read tasks" ON bender_tasks FOR SELECT TO anon USING (true);
CREATE POLICY "Benders can update task progress" ON bender_tasks FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Single user full access" ON bender_tasks FOR ALL TO public USING (true);

-- bender_team_members
CREATE POLICY "Allow all for authenticated" ON bender_team_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON bender_team_members FOR ALL TO service_role USING (true) WITH CHECK (true);

-- bender_teams
CREATE POLICY "Single user full access" ON bender_teams FOR ALL TO public USING (true);

-- canvases
CREATE POLICY "Allow all for authenticated" ON canvases FOR ALL TO public USING (true) WITH CHECK (true);

-- identity_project_context
CREATE POLICY "Allow all for authenticated" ON identity_project_context FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON identity_project_context FOR ALL TO service_role USING (true) WITH CHECK (true);

-- identity_recommendations
CREATE POLICY "Allow all for authenticated" ON identity_recommendations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON identity_recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- inbox_items
CREATE POLICY "Inbox items are creatable by anon" ON inbox_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Inbox items are deletable by authenticated users" ON inbox_items FOR DELETE TO authenticated, service_role USING (true);
CREATE POLICY "Inbox items are publicly readable" ON inbox_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Inbox items are writable by authenticated users" ON inbox_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Inbox items full access for service role" ON inbox_items FOR ALL TO service_role USING (true) WITH CHECK (true);

-- kanban_boards
CREATE POLICY "Single user full access" ON kanban_boards FOR ALL TO public USING (true);

-- kanban_cards
CREATE POLICY "Single user full access" ON kanban_cards FOR ALL TO public USING (true);

-- messages
CREATE POLICY "Single user full access" ON messages FOR ALL TO public USING (true);

-- meta_constructs
CREATE POLICY "Allow all for authenticated" ON meta_constructs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON meta_constructs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- model_library
CREATE POLICY "model_library_read" ON model_library FOR SELECT TO public USING (true);

-- nexus_agent_sessions
CREATE POLICY "nas_auth" ON nexus_agent_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "nas_svc" ON nexus_agent_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- nexus_cards
CREATE POLICY "nc_auth" ON nexus_cards FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "nc_svc" ON nexus_cards FOR ALL TO service_role USING (true) WITH CHECK (true);

-- nexus_comments
CREATE POLICY "ncm_auth" ON nexus_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ncm_svc" ON nexus_comments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- nexus_context_packages
CREATE POLICY "ncp_auth" ON nexus_context_packages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ncp_svc" ON nexus_context_packages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- nexus_events
CREATE POLICY "ne_auth" ON nexus_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ne_svc" ON nexus_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- nexus_locks
CREATE POLICY "nl_auth" ON nexus_locks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "nl_svc" ON nexus_locks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- nexus_projects
CREATE POLICY "np_auth" ON nexus_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "np_svc" ON nexus_projects FOR ALL TO service_role USING (true) WITH CHECK (true);

-- nexus_task_details
CREATE POLICY "ntd_auth" ON nexus_task_details FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ntd_svc" ON nexus_task_details FOR ALL TO service_role USING (true) WITH CHECK (true);

-- project_benders
CREATE POLICY "Single user full access" ON project_benders FOR ALL TO public USING (true);

-- project_templates
CREATE POLICY "Single user full access" ON project_templates FOR ALL TO public USING (true);

-- projects
CREATE POLICY "Single user full access" ON projects FOR ALL TO public USING (true);

-- queen_events
CREATE POLICY "Allow all for authenticated" ON queen_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON queen_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- routing_config
CREATE POLICY "routing_config_read" ON routing_config FOR SELECT TO public USING (true);

-- skills
CREATE POLICY "Skills are publicly readable" ON skills FOR SELECT TO anon USING (true);
CREATE POLICY "Skills are viewable by authenticated users" ON skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Skills are writable by service role" ON skills FOR ALL TO service_role USING (true) WITH CHECK (true);

-- supervisor_lenses
CREATE POLICY "Allow all for authenticated" ON supervisor_lenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON supervisor_lenses FOR ALL TO service_role USING (true) WITH CHECK (true);

-- sync_state
CREATE POLICY "Allow all for authenticated" ON sync_state FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON sync_state FOR ALL TO service_role USING (true) WITH CHECK (true);

-- task_type_routing
CREATE POLICY "task_type_routing_read" ON task_type_routing FOR SELECT TO public USING (true);

-- user_learnings
CREATE POLICY "Single user full access" ON user_learnings FOR ALL TO public USING (true);

-- webhook_configs
CREATE POLICY "Allow all for authenticated" ON webhook_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON webhook_configs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- workflows
CREATE POLICY "Single user full access" ON workflows FOR ALL TO public USING (true);
CREATE POLICY "Workflows are publicly readable" ON workflows FOR SELECT TO anon USING (true);
CREATE POLICY "Workflows are viewable by authenticated users" ON workflows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Workflows are writable by service role" ON workflows FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 11. TRIGGERS
-- =============================================================================

CREATE TRIGGER arch_annotations_updated_at BEFORE UPDATE ON architecture_annotations FOR EACH ROW EXECUTE FUNCTION update_arch_annotations_updated_at();
CREATE TRIGGER canvases_updated_at BEFORE UPDATE ON canvases FOR EACH ROW EXECUTE FUNCTION update_canvases_updated_at();
CREATE TRIGGER inbox_items_updated_at BEFORE UPDATE ON inbox_items FOR EACH ROW EXECUTE FUNCTION update_inbox_items_updated_at();
CREATE TRIGGER nexus_card_auto_id BEFORE INSERT ON nexus_cards FOR EACH ROW EXECUTE FUNCTION nexus_generate_card_id();
CREATE TRIGGER nexus_card_auto_lock AFTER UPDATE ON nexus_cards FOR EACH ROW EXECUTE FUNCTION nexus_auto_lock();
CREATE TRIGGER nexus_card_changes BEFORE UPDATE ON nexus_cards FOR EACH ROW EXECUTE FUNCTION nexus_emit_card_event();
CREATE TRIGGER nexus_card_completion BEFORE UPDATE ON nexus_cards FOR EACH ROW EXECUTE FUNCTION nexus_card_completion();
CREATE TRIGGER nexus_card_created AFTER INSERT ON nexus_cards FOR EACH ROW EXECUTE FUNCTION nexus_emit_card_created();
CREATE TRIGGER nexus_comment_created AFTER INSERT ON nexus_comments FOR EACH ROW EXECUTE FUNCTION nexus_emit_comment_event();
CREATE TRIGGER nexus_comment_discord_notify AFTER INSERT ON nexus_comments FOR EACH ROW EXECUTE FUNCTION nexus_discord_comment_notify();
CREATE TRIGGER nexus_pivot_handler AFTER INSERT ON nexus_comments FOR EACH ROW WHEN ((NEW.is_pivot = true) AND (NEW.pivot_impact = 'major'::text)) EXECUTE FUNCTION nexus_handle_pivot();
CREATE TRIGGER nexus_lock_changes AFTER INSERT OR UPDATE ON nexus_locks FOR EACH ROW EXECUTE FUNCTION nexus_emit_lock_event();
CREATE TRIGGER nexus_projects_updated BEFORE UPDATE ON nexus_projects FOR EACH ROW EXECUTE FUNCTION nexus_update_timestamp();
CREATE TRIGGER nexus_context_staleness AFTER UPDATE ON nexus_task_details FOR EACH ROW EXECUTE FUNCTION nexus_mark_context_stale();
CREATE TRIGGER nexus_task_details_updated BEFORE UPDATE ON nexus_task_details FOR EACH ROW EXECUTE FUNCTION nexus_update_timestamp();
CREATE TRIGGER skills_updated_at BEFORE UPDATE ON skills FOR EACH ROW EXECUTE FUNCTION update_skills_updated_at();
CREATE TRIGGER workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_workflows_updated_at();

COMMIT;
