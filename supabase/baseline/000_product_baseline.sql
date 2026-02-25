-- [product-baseline] Complete product schema for fresh user DB provisioning
-- Generated: 2026-02-25
-- Source: dea-exmachina-admin (hehldpjqlxhshdqqadng) — post Phase 2
--
-- Applies cleanly to a fresh Supabase project.
-- Contains: ENUM types, functions, 46 tables (42 product + 4 platform-seed),
--           triggers, create_nexus_card RPC, _schema_meta, _migration_log,
--           seed data (nexus_lane_transitions, model_library)
--
-- Transformations vs admin DB:
--   - user_id columns: DEFAULT auth.uid() for immutable tables; no default elsewhere
--   - RLS enabled on all product tables (direct user_id or subquery)
--   - Discord webhook triggers stripped (admin-only)
--   - Admin UUID defaults replaced with auth.uid()
-- ===========================================================================

BEGIN;

-- ===========================================================================
-- EXTENSIONS
-- ===========================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================================================================
-- ENUM TYPES
-- ===========================================================================
DO $$ BEGIN
  CREATE TYPE nexus_framework_id AS ENUM (
    'first-principles','pre-mortem','working-backwards','rice','tdd',
    'separation-of-concerns','integration-first','progressive-enhancement',
    'pyramid-principle','scqa','documentation-as-code','design-thinking',
    'visual-first','atomic-design','swot','inversion','second-order-thinking',
    'jtbd','stoic-control','occams-razor','via-negativa','raci',
    'capability-mapping','tuckman','rfc','retrospective','decision-log',
    'five-whys','issue-trees','constraint-analysis','cynefin',
    'hive-team-construction','ogsm'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE signal_domain AS ENUM (
    'supabase.migrations','supabase.rls','supabase.functions','supabase.realtime',
    'react.components','react.auth','react.data-fetching',
    'api.design','api.routing','git.workflow',
    'bender.dispatch','context.triggers','system.governance',
    'system.infrastructure','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===========================================================================
-- HELPER FUNCTIONS
-- ===========================================================================
CREATE OR REPLACE FUNCTION normalize_newlines(p_text text)
  RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT REPLACE(REPLACE(p_text, E'\\n', chr(10)), E'\\r', chr(13));
$$;

CREATE OR REPLACE FUNCTION log_audit(
  p_action      text,
  p_category    text,
  p_entity_type text,
  p_entity_id   uuid    DEFAULT NULL,
  p_old_value   jsonb   DEFAULT NULL,
  p_new_value   jsonb   DEFAULT NULL,
  p_metadata    jsonb   DEFAULT '{}',
  p_actor       text    DEFAULT 'system',
  p_actor_type  text    DEFAULT 'system',
  p_project_id  uuid    DEFAULT NULL,
  p_card_id     text    DEFAULT NULL,
  p_source      text    DEFAULT 'trigger'
) RETURNS uuid LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_event_id TEXT; v_audit_id UUID;
BEGIN
  v_event_id := p_category || '.' || p_action;
  INSERT INTO audit_log (
    event_id, action, category, actor, actor_type,
    entity_type, entity_id, project_id, card_id,
    old_value, new_value, metadata, source
  ) VALUES (
    v_event_id, p_action, p_category, p_actor, p_actor_type,
    p_entity_type, p_entity_id, p_project_id, p_card_id,
    p_old_value, p_new_value, p_metadata, p_source
  ) RETURNING id INTO v_audit_id;
  RETURN v_audit_id;
END;
$$;

-- ===========================================================================
-- TRIGGER FUNCTIONS
-- ===========================================================================

-- Immutability guards
CREATE OR REPLACE FUNCTION audit_log_immutable()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only. Updates and deletes are prohibited.';
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION fn_block_signal_update()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'learning_signals is append-only. Use superseded_by to correct a signal.';
END;
$$;

CREATE OR REPLACE FUNCTION enforce_workspace_audit_immutability()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RAISE EXCEPTION 'workspace_audit_events is append-only. % is not permitted. Row id: %.',
    TG_OP, CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  RETURN NULL;
END;
$$;

-- Card ID generation
CREATE OR REPLACE FUNCTION nexus_generate_card_id()
  RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prefix TEXT; num INTEGER;
BEGIN
  IF NEW.card_id IS NULL OR NEW.card_id = '' THEN
    SELECT card_id_prefix, next_card_number INTO prefix, num
      FROM nexus_projects WHERE id = NEW.project_id FOR UPDATE;
    NEW.card_id := prefix || '-' || LPAD(num::TEXT, 3, '0');
    UPDATE nexus_projects SET next_card_number = num + 1 WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION nexus_cards_increment_version()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION nexus_reset_ready_for_production()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF OLD.lane = 'review' AND NEW.lane != 'review' THEN
    NEW.ready_for_production := false;
  END IF;
  RETURN NEW;
END;
$$;

-- Validation triggers
CREATE OR REPLACE FUNCTION validate_lane_transition()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF OLD.lane IS DISTINCT FROM NEW.lane THEN
    IF NOT EXISTS (
      SELECT 1 FROM nexus_lane_transitions
      WHERE lane_type = 'standard' AND from_lane = OLD.lane AND to_lane = NEW.lane
    ) THEN
      RAISE EXCEPTION 'Invalid lane transition: % → %. Check nexus_lane_transitions.', OLD.lane, NEW.lane;
    END IF;
    NEW.lane_changes := COALESCE(OLD.lane_changes, 0) + 1;
  END IF;
  IF OLD.bender_lane IS DISTINCT FROM NEW.bender_lane
     AND OLD.bender_lane IS NOT NULL AND NEW.bender_lane IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM nexus_lane_transitions
      WHERE lane_type = 'bender' AND from_lane = OLD.bender_lane AND to_lane = NEW.bender_lane
    ) THEN
      RAISE EXCEPTION 'Invalid bender lane transition: % → %.', OLD.bender_lane, NEW.bender_lane;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_assigned_to()
  RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_retired_at TIMESTAMPTZ;
BEGIN
  SET search_path TO 'public';
  IF NEW.assigned_to IS NULL THEN RETURN NEW; END IF;
  SELECT retired_at INTO v_retired_at FROM bender_identities WHERE slug = NEW.assigned_to;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'assigned_to "%" is not a valid bender slug.', NEW.assigned_to;
  END IF;
  IF v_retired_at IS NOT NULL THEN
    RAISE EXCEPTION 'assigned_to "%" is retired (retired at %).', NEW.assigned_to, v_retired_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_parent_epic()
  RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_parent_card_type TEXT; v_parent_card_id TEXT;
BEGIN
  SET search_path TO 'public';
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  SELECT card_type, card_id INTO v_parent_card_type, v_parent_card_id
    FROM nexus_cards WHERE id = NEW.parent_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'parent_id references non-existent card'; END IF;
  IF v_parent_card_type != 'epic' THEN
    RAISE EXCEPTION 'parent_id must reference a card with card_type = epic (got: %, type: %)',
      v_parent_card_id, v_parent_card_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_blocked_by()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE blocker_card_id text; blocker_lane text; unresolved text[];
BEGIN
  IF NEW.lane IN ('in_progress','review','done')
     AND OLD.lane IN ('backlog','ready')
     AND NEW.blocked_by IS NOT NULL
     AND array_length(NEW.blocked_by, 1) > 0 THEN
    unresolved := '{}';
    FOREACH blocker_card_id IN ARRAY NEW.blocked_by LOOP
      SELECT lane INTO blocker_lane FROM nexus_cards WHERE card_id = blocker_card_id;
      IF blocker_lane IS NULL THEN
        RAISE WARNING 'Blocker card % not found, skipping', blocker_card_id;
      ELSIF blocker_lane != 'done' THEN
        unresolved := array_append(unresolved, blocker_card_id || ' (' || blocker_lane || ')');
      END IF;
    END LOOP;
    IF array_length(unresolved, 1) > 0 THEN
      RAISE EXCEPTION 'Card % blocked by: %', NEW.card_id, array_to_string(unresolved, ', ');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Business logic triggers
CREATE OR REPLACE FUNCTION enforce_delegation()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.lane = 'in_progress' AND (OLD.lane IS DISTINCT FROM 'in_progress') THEN
    IF NEW.delegation_tag = 'BENDER' THEN
      IF NOT EXISTS (SELECT 1 FROM bender_tasks WHERE task_id = NEW.card_id) THEN
        NEW.delegation_bypassed := true;
        INSERT INTO nexus_comments (card_id, author, content) VALUES (
          NEW.id, 'system',
          '⚠️ **Delegation bypass detected**: Card tagged BENDER but no bender_task exists.'
        );
      ELSE
        NEW.delegation_bypassed := false;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION auto_flag_for_production()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.lane = 'review' AND (OLD.lane IS NULL OR OLD.lane != 'review') THEN
    IF EXISTS (
      SELECT 1 FROM routing_config
      WHERE key = 'auto_flag_on_review' AND (value->>'enabled')::boolean = true
    ) THEN
      NEW.ready_for_production := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_preflight_gate()
  RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_has_preflight BOOLEAN;
BEGIN
  IF OLD.bender_lane = 'queued' AND NEW.bender_lane = 'executing' THEN
    SELECT EXISTS (
      SELECT 1 FROM nexus_comments
      WHERE card_id = NEW.id AND content ILIKE 'PRE-FLIGHT:%'
        AND created_at >= NOW() - INTERVAL '7 days'
    ) INTO v_has_preflight;
    IF NOT v_has_preflight THEN
      RAISE EXCEPTION 'PRE-FLIGHT gate: card % cannot move queued→executing without a PRE-FLIGHT comment.', NEW.card_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_learning_gate()
  RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_has_learning BOOLEAN;
BEGIN
  IF OLD.bender_lane = 'executing' AND NEW.bender_lane = 'delivered' THEN
    SELECT EXISTS (
      SELECT 1 FROM nexus_comments
      WHERE card_id = NEW.id AND content ILIKE '%LEARNING:%'
        AND created_at >= NOW() - INTERVAL '7 days'
    ) INTO v_has_learning;
    IF NOT v_has_learning THEN
      RAISE EXCEPTION 'LEARNING gate: card % cannot move executing→delivered without a LEARNING comment.', NEW.card_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION bender_done_create_pending_score()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.lane = 'done' AND OLD.lane != 'done'
     AND NEW.delegation_tag = 'BENDER' AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO bender_performance (bender_slug, bender_name, task_id, level, reviewed_by)
    VALUES (NEW.assigned_to, NEW.assigned_to, NEW.card_id, 'pending', 'pending')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION comment_on_card_created()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_actor text;
BEGIN
  v_actor := COALESCE(current_setting('app.actor', true), 'system');
  INSERT INTO nexus_comments (card_id, author, content, comment_type, is_pivot)
  VALUES (NEW.id, 'system', format('Card created in %s lane by %s', NEW.lane, v_actor), 'system', false);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION auto_comment_lane_change()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Lane change facts captured in nexus_events; nexus_comments reserved for human/agent communication.
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_surface_autofill()
  RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_db TEXT := 'NONE'; v_api TEXT := 'NONE'; v_ui TEXT := 'NONE';
  v_types TEXT := 'NONE'; v_tests TEXT := 'NONE';
  v_docs TEXT := 'NONE'; v_config TEXT := 'NONE';
  v_title TEXT; v_prefix TEXT;
BEGIN
  IF OLD.lane != 'backlog' OR NEW.lane != 'ready' THEN RETURN NEW; END IF;
  v_title  := lower(NEW.title);
  v_prefix := upper(split_part(NEW.card_id, '-', 1));
  IF v_prefix = 'CC' THEN v_ui := 'Components/pages (CC)'; v_api := 'API routes (CC)';
  ELSIF v_prefix IN ('NEX','NEXUS') THEN v_db := 'nexus_* tables'; v_api := 'NEXUS API routes';
  ELSIF v_prefix = 'DEA' THEN v_config := 'Vault config/workflows'; v_docs := 'Vault docs';
  ELSIF v_prefix = 'KERKO' THEN v_docs := 'Kerkoporta content'; END IF;
  IF v_title ~* 'migration|trigger|function|schema|table|column' THEN
    v_db := CASE WHEN v_db = 'NONE' THEN 'DB schema changes' ELSE v_db || ' + schema' END; END IF;
  IF v_title ~* 'dashboard|widget|component|page|ui|modal|form' THEN
    v_ui := CASE WHEN v_ui = 'NONE' THEN 'UI components/pages' ELSE v_ui || ' + UI' END; END IF;
  IF v_title ~* '\btype\b|interface|model' THEN v_types := 'TypeScript types'; END IF;
  IF v_title ~* '\btest\b|spec|jest|playwright' THEN v_tests := 'Test files'; END IF;
  IF v_title ~* '\bdoc\b|readme|guide|workflow|spec' THEN
    v_docs := CASE WHEN v_docs = 'NONE' THEN 'Documentation' ELSE v_docs || ' + docs' END; END IF;
  INSERT INTO nexus_comments (card_id, author, content, comment_type)
  VALUES (NEW.id, 'system', format(
    E'SURFACE: (auto-inferred — refine before first commit)\n- DB: %s\n- API: %s\n- UI: %s\n- Types: %s\n- Tests: %s\n- Docs: %s\n- Config: %s',
    v_db, v_api, v_ui, v_types, v_tests, v_docs, v_config), 'surface');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_question_comment()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_card_id_text text; v_card_title text;
BEGIN
  IF NEW.comment_type != 'question' THEN RETURN NEW; END IF;
  SELECT card_id, title INTO v_card_id_text, v_card_title FROM nexus_cards WHERE id = NEW.card_id;
  INSERT INTO nexus_events (event_type, card_id, actor, payload)
  VALUES ('question_raised', NEW.card_id, NEW.author, jsonb_build_object(
    'summary', NEW.author || ' raised a question on ' || COALESCE(v_card_id_text, 'unknown card'),
    'card_title', v_card_title, 'comment', NEW.content, 'comment_id', NEW.id
  ));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION sync_agent_session_from_task()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_agent TEXT; v_session_status TEXT; v_session_id UUID;
BEGIN
  v_agent := COALESCE(NEW.member, NEW.bender_role, 'unknown');
  CASE NEW.status
    WHEN 'proposed'  THEN v_session_status := 'idle';
    WHEN 'queued'    THEN v_session_status := 'idle';
    WHEN 'executing' THEN v_session_status := 'active';
    WHEN 'delivered' THEN v_session_status := 'completed';
    WHEN 'integrated'THEN v_session_status := 'completed';
    WHEN 'rejected'  THEN v_session_status := 'completed';
    ELSE v_session_status := 'idle';
  END CASE;
  SELECT id INTO v_session_id FROM nexus_agent_sessions
    WHERE metadata->>'task_id' = NEW.id::text LIMIT 1;
  IF v_session_id IS NOT NULL THEN
    UPDATE nexus_agent_sessions SET
      status = v_session_status,
      ended_at = CASE WHEN v_session_status = 'completed' THEN now() ELSE NULL END,
      metadata = jsonb_set(jsonb_set(metadata,'{task_status}',to_jsonb(NEW.status)),'{task_title}',to_jsonb(NEW.title))
    WHERE id = v_session_id;
  ELSE
    INSERT INTO nexus_agent_sessions (agent, model, status, metadata)
    VALUES (v_agent, NEW.platform, v_session_status, jsonb_build_object(
      'task_id', NEW.id, 'task_code', NEW.task_id, 'task_title', NEW.title,
      'task_status', NEW.status, 'priority', NEW.priority));
  END IF;
  RETURN NEW;
END;
$$;

-- Audit triggers
CREATE OR REPLACE FUNCTION audit_card_created()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_actor TEXT;
BEGIN
  v_actor := COALESCE(NULLIF(current_setting('app.actor', true), ''), 'system');
  PERFORM log_audit('created','card','nexus_cards',NEW.id,NULL,
    jsonb_build_object('card_id',NEW.card_id,'title',NEW.title,'lane',NEW.lane,'card_type',NEW.card_type,'delegation_tag',NEW.delegation_tag),
    v_actor, CASE WHEN v_actor='system' OR v_actor='trigger' THEN 'system' WHEN v_actor LIKE 'bender%' THEN 'bender' ELSE 'dea' END,
    NEW.project_id, NEW.card_id, 'trigger');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION audit_card_updated()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_actor text;
BEGIN
  v_actor := COALESCE(current_setting('app.actor', true), 'system');
  IF OLD.lane IS DISTINCT FROM NEW.lane THEN
    PERFORM log_audit('lane_changed','card','nexus_cards',NEW.id,to_jsonb(OLD.lane),to_jsonb(NEW.lane),'{}',v_actor,'trigger',NEW.project_id,NEW.card_id,'nexus_cards'); END IF;
  IF OLD.bender_lane IS DISTINCT FROM NEW.bender_lane THEN
    PERFORM log_audit('bender_lane_changed','card','nexus_cards',NEW.id,to_jsonb(OLD.bender_lane),to_jsonb(NEW.bender_lane),'{}',v_actor,'trigger',NEW.project_id,NEW.card_id,'nexus_cards'); END IF;
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    PERFORM log_audit('priority_changed','card','nexus_cards',NEW.id,to_jsonb(OLD.priority),to_jsonb(NEW.priority),'{}',v_actor,'trigger',NEW.project_id,NEW.card_id,'nexus_cards'); END IF;
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    PERFORM log_audit('assigned','card','nexus_cards',NEW.id,to_jsonb(OLD.assigned_to),to_jsonb(NEW.assigned_to),'{}',v_actor,'trigger',NEW.project_id,NEW.card_id,'nexus_cards'); END IF;
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    PERFORM log_audit('title_changed','card','nexus_cards',NEW.id,to_jsonb(LEFT(OLD.title,500)),to_jsonb(LEFT(NEW.title,500)),'{}',v_actor,'trigger',NEW.project_id,NEW.card_id,'nexus_cards'); END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION audit_card_rfp()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF OLD.ready_for_production IS DISTINCT FROM NEW.ready_for_production THEN
    PERFORM log_audit('flagged_for_production','card','nexus_cards',NEW.id,
      to_jsonb(OLD.ready_for_production),to_jsonb(NEW.ready_for_production),'{}',
      COALESCE(current_setting('app.actor',true),'system'),'trigger',NEW.project_id,NEW.card_id,'nexus_cards');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION audit_comment_created()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_card nexus_cards%ROWTYPE;
BEGIN
  SELECT * INTO v_card FROM nexus_cards WHERE id = NEW.card_id;
  PERFORM log_audit('created','comment','nexus_comments',NEW.id,NULL,
    jsonb_build_object('content_preview',LEFT(NEW.content,200),'comment_type',NEW.comment_type,'is_pivot',NEW.is_pivot,'author',NEW.author),
    NEW.author,
    CASE WHEN NEW.author='system' OR NEW.author='trigger' THEN 'system' WHEN NEW.author LIKE 'bender%' THEN 'bender' ELSE 'dea' END,
    v_card.project_id, v_card.card_id, 'trigger');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION audit_lock_event()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  PERFORM log_audit('acquired','lock','nexus_locks',NEW.id,NULL,
    jsonb_build_object('lock_type',NEW.lock_type,'target',COALESCE(NEW.target,'')),'{}',
    NEW.agent,'trigger',NULL,NULL,'trigger');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION audit_project_change()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_actor TEXT; v_actor_type TEXT;
BEGIN
  v_actor := COALESCE(NULLIF(current_setting('app.actor',true),''),'system');
  v_actor_type := CASE WHEN v_actor LIKE 'bender%' THEN 'bender' WHEN v_actor IN ('system','trigger') THEN 'system' ELSE 'dea' END;
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit('created','project','nexus_projects',NEW.id,NULL,jsonb_build_object('name',NEW.name,'slug',NEW.slug),'{}',v_actor,v_actor_type,NEW.id,NULL,'trigger'); RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit('updated','project','nexus_projects',NEW.id,jsonb_build_object('name',OLD.name,'slug',OLD.slug),jsonb_build_object('name',NEW.name,'slug',NEW.slug),'{}',v_actor,v_actor_type,NEW.id,NULL,'trigger'); RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit('deleted','project','nexus_projects',OLD.id,jsonb_build_object('name',OLD.name,'slug',OLD.slug),NULL,'{}',v_actor,v_actor_type,OLD.id,NULL,'trigger'); RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION audit_sprint_change()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN v_action := 'created';
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    v_action := CASE NEW.status WHEN 'active' THEN 'activated' WHEN 'completed' THEN 'completed' ELSE 'updated' END;
  ELSE v_action := 'updated'; END IF;
  PERFORM log_audit(v_action,'sprint','nexus_sprints',NEW.id,
    CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD.status) ELSE NULL END,
    to_jsonb(NEW.status),jsonb_build_object('name',NEW.name),'dea','trigger',NULL,NULL,'trigger');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION audit_workstream_change()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_actor TEXT; v_actor_type TEXT;
BEGIN
  v_actor := COALESCE(NULLIF(current_setting('app.actor',true),''),'system');
  v_actor_type := CASE WHEN v_actor LIKE 'bender%' THEN 'bender' WHEN v_actor IN ('system','trigger') THEN 'system' ELSE 'dea' END;
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit('created','workstream','nexus_workstreams',NEW.id,NULL,jsonb_build_object('name',NEW.name,'status',NEW.status),'{}',v_actor,v_actor_type,NULL,NULL,'trigger'); RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit(CASE WHEN OLD.status IS DISTINCT FROM NEW.status AND NEW.status='completed' THEN 'completed' ELSE 'updated' END,'workstream','nexus_workstreams',NEW.id,jsonb_build_object('status',OLD.status),jsonb_build_object('status',NEW.status),'{}',v_actor,v_actor_type,NULL,NULL,'trigger'); RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit('deleted','workstream','nexus_workstreams',OLD.id,jsonb_build_object('name',OLD.name,'status',OLD.status),NULL,'{}',v_actor,v_actor_type,NULL,NULL,'trigger'); RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION audit_team_change()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_actor TEXT; v_actor_type TEXT; v_action TEXT;
BEGIN
  v_actor := COALESCE(NULLIF(current_setting('app.actor',true),''),'system');
  v_actor_type := CASE WHEN v_actor LIKE 'bender%' THEN 'bender' WHEN v_actor IN ('system','trigger') THEN 'system' ELSE 'dea' END;
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit('created','team','bender_teams',NEW.id,NULL,jsonb_build_object('name',NEW.name,'slug',NEW.slug,'members',NEW.members),'{}',v_actor,v_actor_type,NEW.project_id,NULL,'trigger'); RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := CASE WHEN OLD.members IS DISTINCT FROM NEW.members AND jsonb_array_length(COALESCE(NEW.members,'[]'::jsonb)) > jsonb_array_length(COALESCE(OLD.members,'[]'::jsonb)) THEN 'member_added' ELSE 'updated' END;
    PERFORM log_audit(v_action,'team','bender_teams',NEW.id,jsonb_build_object('name',OLD.name,'members',OLD.members),jsonb_build_object('name',NEW.name,'members',NEW.members),'{}',v_actor,v_actor_type,NEW.project_id,NULL,'trigger'); RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit('deleted','team','bender_teams',OLD.id,jsonb_build_object('name',OLD.name,'slug',OLD.slug),NULL,'{}',v_actor,v_actor_type,OLD.project_id,NULL,'trigger'); RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION audit_bender_task_change()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_actor TEXT; v_actor_type TEXT; v_action TEXT; v_card_display TEXT;
BEGIN
  v_actor := COALESCE(NULLIF(current_setting('app.actor',true),''),'system');
  v_actor_type := CASE WHEN v_actor LIKE 'bender%' THEN 'bender' WHEN v_actor IN ('system','trigger') THEN 'system' ELSE 'dea' END;
  v_card_display := CASE WHEN TG_OP='DELETE' THEN OLD.card_id ELSE NEW.card_id END;
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit('task_created','bender','bender_tasks',NEW.id,NULL,jsonb_build_object('title',NEW.title,'status',NEW.status,'bender_role',NEW.bender_role,'platform',NEW.platform),'{}',v_actor,v_actor_type,NULL,v_card_display,'trigger'); RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := CASE WHEN OLD.status IS DISTINCT FROM NEW.status THEN CASE NEW.status WHEN 'delivered' THEN 'delivered' ELSE 'task_updated' END ELSE 'task_updated' END;
    PERFORM log_audit(v_action,'bender','bender_tasks',NEW.id,jsonb_build_object('status',OLD.status,'title',OLD.title),jsonb_build_object('status',NEW.status,'title',NEW.title),'{}',v_actor,v_actor_type,NULL,v_card_display,'trigger'); RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit('deleted','bender','bender_tasks',OLD.id,jsonb_build_object('title',OLD.title,'status',OLD.status),NULL,'{}',v_actor,v_actor_type,NULL,v_card_display,'trigger'); RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION audit_setting_change()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_actor TEXT;
BEGIN
  v_actor := COALESCE(NULLIF(current_setting('app.actor',true),''),'system');
  IF TG_OP='INSERT' THEN PERFORM log_audit('created','setting','user_settings',NEW.id,NULL,to_jsonb(NEW),'{}',v_actor,'dea',NULL,NULL,'trigger'); RETURN NEW;
  ELSIF TG_OP='UPDATE' THEN PERFORM log_audit('updated','setting','user_settings',NEW.id,to_jsonb(OLD),to_jsonb(NEW),'{}',v_actor,'dea',NULL,NULL,'trigger'); RETURN NEW;
  ELSIF TG_OP='DELETE' THEN PERFORM log_audit('deleted','setting','user_settings',OLD.id,to_jsonb(OLD),NULL,'{}',v_actor,'dea',NULL,NULL,'trigger'); RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Timestamp update triggers
CREATE OR REPLACE FUNCTION update_tech_stack_timestamp()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION update_workflows_timestamp()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION update_user_settings_timestamp()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION update_workspace_scope_updated_at()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION update_workspaces_updated_at()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ===========================================================================
-- PLATFORM-SEED TABLES (no user_id, platform-managed, no RLS)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS project_templates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  description         TEXT,
  project_type        TEXT NOT NULL CHECK (project_type = ANY(ARRAY['software','content','life','business','hobby','custom'])),
  icon                TEXT,
  dashboard_layout    JSONB NOT NULL,
  suggested_benders   JSONB,
  starter_workflows   TEXT[],
  initial_data_schema JSONB,
  setup_questions     JSONB,
  created_by          UUID,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS model_library (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 TEXT NOT NULL UNIQUE,
  provider             TEXT NOT NULL,
  display_name         TEXT NOT NULL,
  cost_tier            INTEGER NOT NULL,
  strengths            TEXT[],
  weaknesses           TEXT[],
  capabilities         TEXT[],
  is_active            BOOLEAN DEFAULT true,
  escalates_to         TEXT REFERENCES model_library(slug) DEFERRABLE INITIALLY DEFERRED,
  context_length       INTEGER,
  input_price_per_mtok NUMERIC,
  output_price_per_mtok NUMERIC,
  latency_p50_ms       INTEGER,
  throughput_tps       NUMERIC,
  host_type            TEXT DEFAULT 'cloud' CHECK (host_type = ANY(ARRAY['cloud','self-hosted','hybrid'])),
  host_url             TEXT,
  model_id             TEXT,
  last_benchmarked_at  TIMESTAMPTZ,
  auto_route_eligible  BOOLEAN DEFAULT false,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category = ANY(ARRAY['meta','identity','bender-management','session','content','development','professional'])),
  workflow    TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status = ANY(ARRAY['active','deprecated','planned'])),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nexus_lane_transitions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lane_type  TEXT NOT NULL CHECK (lane_type = ANY(ARRAY['standard','bender'])),
  from_lane  TEXT NOT NULL,
  to_lane    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (lane_type, from_lane, to_lane)
);

-- ===========================================================================
-- PRODUCT TABLES (with user_id + RLS)
-- Order: dependency-first
-- ===========================================================================

-- --- projects ---
CREATE TABLE IF NOT EXISTS projects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  name                TEXT NOT NULL,
  type                TEXT NOT NULL CHECK (type = ANY(ARRAY['software','content','life','business','hobby','custom'])),
  template_id         UUID REFERENCES project_templates(id),
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status = ANY(ARRAY['active','paused','archived'])),
  dashboard_layout    JSONB,
  repo_path           TEXT,
  git_repo_url        TEXT,
  vercel_project_id   TEXT,
  vercel_team_id      TEXT,
  supabase_project_id TEXT,
  supabase_branch_id  TEXT,
  integrations        JSONB DEFAULT '{}',
  settings            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  user_id             UUID NOT NULL REFERENCES auth.users(id)
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_select" ON projects FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "projects_update" ON projects FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "projects_delete" ON projects FOR DELETE USING (user_id = auth.uid());

-- --- nexus_projects ---
CREATE TABLE IF NOT EXISTS nexus_projects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  delegation_policy   TEXT NOT NULL DEFAULT 'delegation-first' CHECK (delegation_policy = ANY(ARRAY['dea-only','delegation-first'])),
  override_reason     TEXT,
  protected_paths     TEXT[],
  repo_url            TEXT,
  card_id_prefix      TEXT NOT NULL,
  next_card_number    INTEGER NOT NULL DEFAULT 1,
  color               TEXT,
  metadata            JSONB DEFAULT '{}',
  group_slug          TEXT,
  lane_config         JSONB,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  user_id             UUID NOT NULL REFERENCES auth.users(id)
);
ALTER TABLE nexus_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nexus_projects_select" ON nexus_projects FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "nexus_projects_insert" ON nexus_projects FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "nexus_projects_update" ON nexus_projects FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "nexus_projects_delete" ON nexus_projects FOR DELETE USING (user_id = auth.uid());

-- --- nexus_workstreams ---
CREATE TABLE IF NOT EXISTS nexus_workstreams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status = ANY(ARRAY['active','completed','paused'])),
  target_date  DATE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  user_id      UUID NOT NULL REFERENCES auth.users(id)
);
ALTER TABLE nexus_workstreams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nexus_workstreams_select" ON nexus_workstreams FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "nexus_workstreams_insert" ON nexus_workstreams FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "nexus_workstreams_update" ON nexus_workstreams FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "nexus_workstreams_delete" ON nexus_workstreams FOR DELETE USING (user_id = auth.uid());

-- --- nexus_sprints ---
CREATE TABLE IF NOT EXISTS nexus_sprints (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  goal             TEXT,
  status           TEXT NOT NULL DEFAULT 'planning' CHECK (status = ANY(ARRAY['planning','active','completed'])),
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  velocity_target  INTEGER,
  velocity_actual  INTEGER,
  created_at       TIMESTAMPTZ DEFAULT now(),
  user_id          UUID NOT NULL REFERENCES auth.users(id),
  CONSTRAINT chk_sprint_dates CHECK (end_date > start_date)
);
ALTER TABLE nexus_sprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nexus_sprints_select" ON nexus_sprints FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "nexus_sprints_insert" ON nexus_sprints FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "nexus_sprints_update" ON nexus_sprints FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "nexus_sprints_delete" ON nexus_sprints FOR DELETE USING (user_id = auth.uid());

-- --- nexus_cards ---
CREATE TABLE IF NOT EXISTS nexus_cards (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id                  TEXT NOT NULL DEFAULT '' UNIQUE,
  project_id               UUID REFERENCES nexus_projects(id),
  parent_id                UUID REFERENCES nexus_cards(id),
  lane                     TEXT NOT NULL CHECK (lane = ANY(ARRAY['backlog','ready','in_progress','review','done','ideas','drafts','unpublished','published','archive'])),
  bender_lane              TEXT CHECK (bender_lane = ANY(ARRAY['proposed','queued','executing','delivered','integrated'])),
  title                    TEXT NOT NULL,
  summary                  TEXT,
  card_type                TEXT NOT NULL CHECK (card_type = ANY(ARRAY['epic','task','bug','chore','research','article'])),
  delegation_tag           TEXT NOT NULL DEFAULT 'BENDER' CHECK (delegation_tag = ANY(ARRAY['BENDER','DEA'])),
  delegation_justification TEXT,
  assigned_to              TEXT,
  assigned_model           TEXT,
  priority                 TEXT DEFAULT 'normal' CHECK (priority = ANY(ARRAY['critical','high','normal','low'])),
  source                   TEXT,
  tags                     TEXT[],
  subtasks                 JSONB DEFAULT '[]',
  due_date                 TIMESTAMPTZ,
  completed_at             TIMESTAMPTZ,
  metadata                 JSONB DEFAULT '{}',
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now(),
  lane_changes             INTEGER DEFAULT 0,
  version                  INTEGER NOT NULL DEFAULT 1,
  ready_for_production     BOOLEAN DEFAULT false,
  delegation_bypassed      BOOLEAN DEFAULT false,
  bypass_justification     TEXT,
  workstream_id            UUID REFERENCES nexus_workstreams(id),
  sprint_id                UUID REFERENCES nexus_sprints(id),
  blocked_by               TEXT[] DEFAULT '{}',
  test_notes               TEXT,
  discord_thread_id        TEXT,
  reviewed                 BOOLEAN NOT NULL DEFAULT false,
  framework_ids            nexus_framework_id[],
  reopen_count             INTEGER NOT NULL DEFAULT 0,
  reopen_type              TEXT CHECK (reopen_type = ANY(ARRAY['bug_fix','scope_change'])),
  reopen_reason            TEXT
);
ALTER TABLE nexus_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nexus_cards_select" ON nexus_cards FOR SELECT USING (
  EXISTS (SELECT 1 FROM nexus_projects p WHERE p.id = nexus_cards.project_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_cards_insert" ON nexus_cards FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM nexus_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_cards_update" ON nexus_cards FOR UPDATE USING (
  EXISTS (SELECT 1 FROM nexus_projects p WHERE p.id = nexus_cards.project_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_cards_delete" ON nexus_cards FOR DELETE USING (
  EXISTS (SELECT 1 FROM nexus_projects p WHERE p.id = nexus_cards.project_id AND p.user_id = auth.uid())
);

-- --- nexus_comments ---
CREATE TABLE IF NOT EXISTS nexus_comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id      UUID REFERENCES nexus_cards(id),
  author       TEXT NOT NULL,
  content      TEXT NOT NULL,
  comment_type TEXT DEFAULT 'note' CHECK (comment_type = ANY(ARRAY['note','pivot','question','directive','delivery','review','rejection','system','transition','dispatch','surface','learning'])),
  is_pivot     BOOLEAN DEFAULT false,
  pivot_impact TEXT CHECK (pivot_impact = ANY(ARRAY['minor','major'])),
  resolved     BOOLEAN DEFAULT false,
  resolved_by  TEXT,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE nexus_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nexus_comments_select" ON nexus_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = nexus_comments.card_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_comments_insert" ON nexus_comments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = card_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_comments_update" ON nexus_comments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = nexus_comments.card_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_comments_delete" ON nexus_comments FOR DELETE USING (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = nexus_comments.card_id AND p.user_id = auth.uid())
);

-- --- nexus_context_packages ---
CREATE TABLE IF NOT EXISTS nexus_context_packages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id           UUID REFERENCES nexus_cards(id),
  layers            JSONB NOT NULL,
  assembled_files   TEXT[],
  assembled_content TEXT,
  assembled_at      TIMESTAMPTZ DEFAULT now(),
  stale             BOOLEAN DEFAULT false
);
ALTER TABLE nexus_context_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nexus_context_packages_select" ON nexus_context_packages FOR SELECT USING (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = nexus_context_packages.card_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_context_packages_insert" ON nexus_context_packages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = card_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_context_packages_update" ON nexus_context_packages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = nexus_context_packages.card_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_context_packages_delete" ON nexus_context_packages FOR DELETE USING (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = nexus_context_packages.card_id AND p.user_id = auth.uid())
);

-- --- nexus_task_details ---
CREATE TABLE IF NOT EXISTS nexus_task_details (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id             UUID UNIQUE REFERENCES nexus_cards(id),
  overview            TEXT,
  requirements        TEXT,
  acceptance_criteria TEXT,
  constraints         TEXT,
  deliverables        TEXT,
  "references"        TEXT,
  branch              TEXT DEFAULT 'dev',
  declared_scope      TEXT[],
  actual_scope        TEXT[],
  context_package_id  UUID REFERENCES nexus_context_packages(id),
  execution_notes     TEXT,
  review_decision     TEXT CHECK (review_decision = ANY(ARRAY['approved','needs_refinement','insufficient'])),
  review_notes        TEXT,
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         TEXT,
  test_plan           TEXT,
  output_path         TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE nexus_task_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nexus_task_details_select" ON nexus_task_details FOR SELECT USING (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = nexus_task_details.card_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_task_details_insert" ON nexus_task_details FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = card_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_task_details_update" ON nexus_task_details FOR UPDATE USING (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = nexus_task_details.card_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_task_details_delete" ON nexus_task_details FOR DELETE USING (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = nexus_task_details.card_id AND p.user_id = auth.uid())
);

-- --- nexus_events ---
CREATE TABLE IF NOT EXISTS nexus_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  card_id    UUID REFERENCES nexus_cards(id),
  actor      TEXT NOT NULL,
  payload    JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE nexus_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nexus_events_select" ON nexus_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = nexus_events.card_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_events_insert" ON nexus_events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = card_id AND p.user_id = auth.uid())
);

-- --- nexus_locks ---
CREATE TABLE IF NOT EXISTS nexus_locks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_type   TEXT NOT NULL CHECK (lock_type = ANY(ARRAY['task','file','scope','lane_move'])),
  card_id     UUID REFERENCES nexus_cards(id),
  agent       TEXT NOT NULL,
  target      TEXT NOT NULL,
  acquired_at TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  metadata    JSONB DEFAULT '{}'
);
ALTER TABLE nexus_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nexus_locks_select" ON nexus_locks FOR SELECT USING (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = nexus_locks.card_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_locks_insert" ON nexus_locks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = card_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_locks_update" ON nexus_locks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = nexus_locks.card_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_locks_delete" ON nexus_locks FOR DELETE USING (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = nexus_locks.card_id AND p.user_id = auth.uid())
);

-- --- nexus_token_usage ---
CREATE TABLE IF NOT EXISTS nexus_token_usage (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   TEXT,
  model        TEXT NOT NULL,
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens  INTEGER,
  cost_usd     NUMERIC,
  card_id      UUID REFERENCES nexus_cards(id),
  actor        TEXT NOT NULL DEFAULT 'dea',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE nexus_token_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nexus_token_usage_select" ON nexus_token_usage FOR SELECT USING (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = nexus_token_usage.card_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_token_usage_insert" ON nexus_token_usage FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = nexus_token_usage.card_id AND p.user_id = auth.uid())
);

-- --- nexus_card_reopens ---
CREATE TABLE IF NOT EXISTS nexus_card_reopens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id       UUID NOT NULL REFERENCES nexus_cards(id),
  reopened_from TEXT NOT NULL DEFAULT 'done',
  reopened_to   TEXT NOT NULL DEFAULT 'in_progress',
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE nexus_card_reopens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nexus_card_reopens_select" ON nexus_card_reopens FOR SELECT USING (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = nexus_card_reopens.card_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_card_reopens_insert" ON nexus_card_reopens FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = nexus_card_reopens.card_id AND p.user_id = auth.uid())
);

-- --- nexus_agent_sessions ---
CREATE TABLE IF NOT EXISTS nexus_agent_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent      TEXT NOT NULL,
  model      TEXT,
  card_id    UUID REFERENCES nexus_cards(id),
  status     TEXT DEFAULT 'active' CHECK (status = ANY(ARRAY['active','idle','completed'])),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at   TIMESTAMPTZ,
  metadata   JSONB DEFAULT '{}'
);
ALTER TABLE nexus_agent_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nexus_agent_sessions_select" ON nexus_agent_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = nexus_agent_sessions.card_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_agent_sessions_insert" ON nexus_agent_sessions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = card_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_agent_sessions_update" ON nexus_agent_sessions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = nexus_agent_sessions.card_id AND p.user_id = auth.uid())
);

-- --- nexus_routing_rules ---
CREATE TABLE IF NOT EXISTS nexus_routing_rules (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES nexus_projects(id),
  keyword    TEXT NOT NULL UNIQUE,
  priority   INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE nexus_routing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nexus_routing_rules_select" ON nexus_routing_rules FOR SELECT USING (
  EXISTS (SELECT 1 FROM nexus_projects p WHERE p.id = nexus_routing_rules.project_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_routing_rules_insert" ON nexus_routing_rules FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM nexus_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_routing_rules_update" ON nexus_routing_rules FOR UPDATE USING (
  EXISTS (SELECT 1 FROM nexus_projects p WHERE p.id = nexus_routing_rules.project_id AND p.user_id = auth.uid())
);
CREATE POLICY "nexus_routing_rules_delete" ON nexus_routing_rules FOR DELETE USING (
  EXISTS (SELECT 1 FROM nexus_projects p WHERE p.id = nexus_routing_rules.project_id AND p.user_id = auth.uid())
);

-- --- nexus_alerts ---
CREATE TABLE IF NOT EXISTS nexus_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source          TEXT NOT NULL CHECK (source = ANY(ARRAY['vercel','supabase','github','resend','cloudflare','hookify','manual'])),
  severity        TEXT NOT NULL DEFAULT 'info' CHECK (severity = ANY(ARRAY['critical','warning','info'])),
  title           TEXT NOT NULL,
  message         TEXT,
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status = ANY(ARRAY['new','acknowledged','resolved'])),
  card_id         UUID REFERENCES nexus_cards(id),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  user_id         UUID NOT NULL REFERENCES auth.users(id)
);
ALTER TABLE nexus_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nexus_alerts_select" ON nexus_alerts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "nexus_alerts_insert" ON nexus_alerts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "nexus_alerts_update" ON nexus_alerts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "nexus_alerts_delete" ON nexus_alerts FOR DELETE USING (user_id = auth.uid());

-- --- bender_identities ---
CREATE TABLE IF NOT EXISTS bender_identities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  description       TEXT,
  expertise         TEXT[] NOT NULL CHECK (array_length(expertise,1) >= 1 AND array_length(expertise,1) <= 4),
  platforms         TEXT[] NOT NULL,
  context_files     TEXT[],
  system_prompt     TEXT,
  project_count     INTEGER DEFAULT 0,
  display_name      TEXT,
  bender_name       TEXT,
  bender_slug       TEXT,
  lineage           TEXT,
  retired_at        TIMESTAMPTZ,
  retired_reason    TEXT,
  brief             JSONB DEFAULT '{}',
  learnings         TEXT,
  profile           JSONB DEFAULT '{}',
  discord_avatar_url TEXT,
  discord_color     INTEGER DEFAULT 3447003,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  user_id           UUID NOT NULL REFERENCES auth.users(id)
);
ALTER TABLE bender_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bender_identities_select" ON bender_identities FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "bender_identities_insert" ON bender_identities FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "bender_identities_update" ON bender_identities FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "bender_identities_delete" ON bender_identities FOR DELETE USING (user_id = auth.uid());

-- --- bender_teams ---
CREATE TABLE IF NOT EXISTS bender_teams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES nexus_projects(id),
  name            TEXT NOT NULL,
  sequencing      TEXT,
  branch_strategy TEXT,
  markdown_path   TEXT,
  members         JSONB NOT NULL DEFAULT '[]',
  file_ownership  JSONB NOT NULL DEFAULT '{}',
  slug            TEXT,
  display_name    TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE (name),
  UNIQUE (slug)
);
ALTER TABLE bender_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bender_teams_select" ON bender_teams FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "bender_teams_insert" ON bender_teams FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "bender_teams_update" ON bender_teams FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "bender_teams_delete" ON bender_teams FOR DELETE USING (user_id = auth.uid());

-- --- bender_team_members ---
CREATE TABLE IF NOT EXISTS bender_team_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      UUID NOT NULL REFERENCES bender_teams(id),
  identity_id  UUID REFERENCES bender_identities(id),
  role         TEXT NOT NULL,
  platform     TEXT CHECK (platform = ANY(ARRAY['antigravity','claude','codex','any'])),
  sequencing   TEXT,
  context_file TEXT,
  is_dea_led   BOOLEAN DEFAULT false,
  needs_worktree BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (team_id, role)
);
ALTER TABLE bender_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bender_team_members_select" ON bender_team_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM bender_teams t WHERE t.id = bender_team_members.team_id AND t.user_id = auth.uid())
);
CREATE POLICY "bender_team_members_insert" ON bender_team_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM bender_teams t WHERE t.id = team_id AND t.user_id = auth.uid())
);
CREATE POLICY "bender_team_members_update" ON bender_team_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM bender_teams t WHERE t.id = bender_team_members.team_id AND t.user_id = auth.uid())
);
CREATE POLICY "bender_team_members_delete" ON bender_team_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM bender_teams t WHERE t.id = bender_team_members.team_id AND t.user_id = auth.uid())
);

-- --- bender_tasks ---
CREATE TABLE IF NOT EXISTS bender_tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID REFERENCES projects(id),
  task_id             TEXT NOT NULL,
  title               TEXT NOT NULL,
  bender_role         TEXT,
  status              TEXT NOT NULL DEFAULT 'proposed' CHECK (status = ANY(ARRAY['proposed','queued','executing','delivered','integrated','completed'])),
  priority            TEXT DEFAULT 'normal' CHECK (priority = ANY(ARRAY['focus','normal'])),
  branch              TEXT,
  overview            TEXT,
  requirements        TEXT[],
  acceptance_criteria TEXT[],
  execution_notes     TEXT,
  review_decision     TEXT,
  review_feedback     TEXT,
  markdown_path       TEXT,
  team_id             UUID REFERENCES bender_teams(id),
  member              TEXT,
  platform            TEXT CHECK (platform = ANY(ARRAY['gemini','claude','codex','any'])),
  context             TEXT,
  deliverables        TEXT,
  score               NUMERIC,
  target_repo         TEXT,
  heartbeat_at        TIMESTAMPTZ,
  card_id             TEXT,
  delivery_mode       TEXT NOT NULL DEFAULT 'git' CHECK (delivery_mode = ANY(ARRAY['git','file','inline'])),
  regression          BOOLEAN NOT NULL DEFAULT false,
  regression_count    INTEGER NOT NULL DEFAULT 0,
  framework_hint      TEXT[],
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  user_id             UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE (project_id, task_id)
);
ALTER TABLE bender_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bender_tasks_select" ON bender_tasks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "bender_tasks_insert" ON bender_tasks FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "bender_tasks_update" ON bender_tasks FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "bender_tasks_delete" ON bender_tasks FOR DELETE USING (user_id = auth.uid());

-- --- bender_performance ---
CREATE TABLE IF NOT EXISTS bender_performance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bender_name   TEXT NOT NULL,
  bender_slug   TEXT NOT NULL,
  task_id       TEXT NOT NULL,
  identity      TEXT,
  score         INTEGER CHECK (score >= 0 AND score <= 100),
  ewma_snapshot NUMERIC,
  deductions    JSONB,
  level         TEXT CHECK (level = ANY(ARRAY['exemplary','solid','needs_work','rework','pending'])),
  reviewed_at   TIMESTAMPTZ DEFAULT now(),
  reviewed_by   TEXT DEFAULT 'dea',
  task_type     TEXT CHECK (task_type = ANY(ARRAY['epic','task','bug','chore','research','article'])),
  user_id       UUID NOT NULL REFERENCES auth.users(id)
);
ALTER TABLE bender_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bender_performance_select" ON bender_performance FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "bender_performance_insert" ON bender_performance FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "bender_performance_update" ON bender_performance FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "bender_performance_delete" ON bender_performance FOR DELETE USING (user_id = auth.uid());

-- --- project_benders ---
CREATE TABLE IF NOT EXISTS project_benders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES nexus_projects(id),
  identity_id   UUID NOT NULL REFERENCES bender_identities(id),
  role          TEXT,
  invocation    TEXT,
  status        TEXT DEFAULT 'active' CHECK (status = ANY(ARRAY['active','paused'])),
  context_notes TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, identity_id)
);
ALTER TABLE project_benders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_benders_select" ON project_benders FOR SELECT USING (
  EXISTS (SELECT 1 FROM nexus_projects p WHERE p.id = project_benders.project_id AND p.user_id = auth.uid())
);
CREATE POLICY "project_benders_insert" ON project_benders FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM nexus_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
);
CREATE POLICY "project_benders_update" ON project_benders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM nexus_projects p WHERE p.id = project_benders.project_id AND p.user_id = auth.uid())
);
CREATE POLICY "project_benders_delete" ON project_benders FOR DELETE USING (
  EXISTS (SELECT 1 FROM nexus_projects p WHERE p.id = project_benders.project_id AND p.user_id = auth.uid())
);

-- --- project_tech_stack ---
CREATE TABLE IF NOT EXISTS project_tech_stack (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES nexus_projects(id),
  name       TEXT NOT NULL,
  version    TEXT,
  category   TEXT NOT NULL DEFAULT 'framework',
  role       TEXT,
  url        TEXT,
  notes      TEXT,
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, name)
);
ALTER TABLE project_tech_stack ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_tech_stack_select" ON project_tech_stack FOR SELECT USING (
  EXISTS (SELECT 1 FROM nexus_projects p WHERE p.id = project_tech_stack.project_id AND p.user_id = auth.uid())
);
CREATE POLICY "project_tech_stack_insert" ON project_tech_stack FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM nexus_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
);
CREATE POLICY "project_tech_stack_update" ON project_tech_stack FOR UPDATE USING (
  EXISTS (SELECT 1 FROM nexus_projects p WHERE p.id = project_tech_stack.project_id AND p.user_id = auth.uid())
);
CREATE POLICY "project_tech_stack_delete" ON project_tech_stack FOR DELETE USING (
  EXISTS (SELECT 1 FROM nexus_projects p WHERE p.id = project_tech_stack.project_id AND p.user_id = auth.uid())
);

-- --- project_workflows ---
CREATE TABLE IF NOT EXISTS project_workflows (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES nexus_projects(id),
  name           TEXT NOT NULL,
  description    TEXT,
  workflow_path  TEXT,
  trigger_event  TEXT,
  automated      BOOLEAN DEFAULT false,
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, name)
);
ALTER TABLE project_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_workflows_select" ON project_workflows FOR SELECT USING (
  EXISTS (SELECT 1 FROM nexus_projects p WHERE p.id = project_workflows.project_id AND p.user_id = auth.uid())
);
CREATE POLICY "project_workflows_insert" ON project_workflows FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM nexus_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
);
CREATE POLICY "project_workflows_update" ON project_workflows FOR UPDATE USING (
  EXISTS (SELECT 1 FROM nexus_projects p WHERE p.id = project_workflows.project_id AND p.user_id = auth.uid())
);
CREATE POLICY "project_workflows_delete" ON project_workflows FOR DELETE USING (
  EXISTS (SELECT 1 FROM nexus_projects p WHERE p.id = project_workflows.project_id AND p.user_id = auth.uid())
);

-- --- identity_project_context ---
CREATE TABLE IF NOT EXISTS identity_project_context (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id UUID REFERENCES bender_identities(id),
  project_id  UUID REFERENCES projects(id),
  context     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE identity_project_context ENABLE ROW LEVEL SECURITY;
CREATE POLICY "identity_project_context_select" ON identity_project_context FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = identity_project_context.project_id AND p.user_id = auth.uid())
);
CREATE POLICY "identity_project_context_insert" ON identity_project_context FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.user_id = auth.uid())
);
CREATE POLICY "identity_project_context_update" ON identity_project_context FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = identity_project_context.project_id AND p.user_id = auth.uid())
);
CREATE POLICY "identity_project_context_delete" ON identity_project_context FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = identity_project_context.project_id AND p.user_id = auth.uid())
);

-- --- identity_recommendations ---
CREATE TABLE IF NOT EXISTS identity_recommendations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID REFERENCES nexus_cards(id),
  identity_id UUID REFERENCES bender_identities(id),
  score       NUMERIC,
  reason      TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE identity_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "identity_recommendations_select" ON identity_recommendations FOR SELECT USING (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = identity_recommendations.task_id AND p.user_id = auth.uid())
);
CREATE POLICY "identity_recommendations_insert" ON identity_recommendations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM nexus_cards c JOIN nexus_projects p ON p.id = c.project_id WHERE c.id = identity_recommendations.task_id AND p.user_id = auth.uid())
);

-- --- workspaces ---
CREATE TABLE IF NOT EXISTS workspaces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID REFERENCES bender_identities(id),
  workspace_type  TEXT NOT NULL CHECK (workspace_type = ANY(ARRAY['managed','byo','waas'])),
  tier            TEXT NOT NULL CHECK (tier = ANY(ARRAY['free','standard','power','waas'])),
  vm_identifier   TEXT,
  status          TEXT NOT NULL DEFAULT 'provisioning' CHECK (status = ANY(ARRAY['provisioning','active','idle','suspended','stopped','deactivated'])),
  ssh_public_key  TEXT,
  cli_endpoint    TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id         UUID NOT NULL REFERENCES auth.users(id)
);
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspaces_select" ON workspaces FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "workspaces_insert" ON workspaces FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "workspaces_update" ON workspaces FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "workspaces_delete" ON workspaces FOR DELETE USING (user_id = auth.uid());

-- --- workspace_scope ---
CREATE TABLE IF NOT EXISTS workspace_scope (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id),
  source_type     TEXT NOT NULL CHECK (source_type = ANY(ARRAY['github_app','google_drive','upload','vault','framework'])),
  source_id       TEXT NOT NULL,
  display_name    TEXT,
  workspace_path  TEXT,
  sync_status     TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status = ANY(ARRAY['pending','syncing','synced','error','removed'])),
  last_synced_at  TIMESTAMPTZ,
  read_only       BOOLEAN NOT NULL DEFAULT false,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, source_type, source_id)
);
ALTER TABLE workspace_scope ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_scope_select" ON workspace_scope FOR SELECT USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_scope.workspace_id AND w.user_id = auth.uid())
);
CREATE POLICY "workspace_scope_insert" ON workspace_scope FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
);
CREATE POLICY "workspace_scope_update" ON workspace_scope FOR UPDATE USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_scope.workspace_id AND w.user_id = auth.uid())
);
CREATE POLICY "workspace_scope_delete" ON workspace_scope FOR DELETE USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_scope.workspace_id AND w.user_id = auth.uid())
);

-- --- workspace_sessions ---
CREATE TABLE IF NOT EXISTS workspace_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id),
  card_id          UUID REFERENCES nexus_cards(id),
  card_ref         TEXT,
  agent_id         UUID REFERENCES bender_identities(id),
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at         TIMESTAMPTZ,
  duration_seconds INTEGER,
  command_log      JSONB NOT NULL DEFAULT '[]',
  summary          TEXT,
  files_modified   TEXT[] DEFAULT '{}',
  metadata         JSONB NOT NULL DEFAULT '{}'
);
ALTER TABLE workspace_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_sessions_select" ON workspace_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_sessions.workspace_id AND w.user_id = auth.uid())
);
CREATE POLICY "workspace_sessions_insert" ON workspace_sessions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
);
CREATE POLICY "workspace_sessions_update" ON workspace_sessions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_sessions.workspace_id AND w.user_id = auth.uid())
);

-- --- workspace_tokens ---
CREATE TABLE IF NOT EXISTS workspace_tokens (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id),
  token_type        TEXT NOT NULL CHECK (token_type = ANY(ARRAY['workspace','mcp'])),
  scopes            TEXT[] NOT NULL DEFAULT '{}',
  agent_id          UUID REFERENCES bender_identities(id),
  jti               TEXT UNIQUE,
  issued_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ NOT NULL,
  last_refreshed_at TIMESTAMPTZ,
  revoked_at        TIMESTAMPTZ,
  revocation_reason TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}'
);
ALTER TABLE workspace_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_tokens_select" ON workspace_tokens FOR SELECT USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_tokens.workspace_id AND w.user_id = auth.uid())
);
CREATE POLICY "workspace_tokens_insert" ON workspace_tokens FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
);
CREATE POLICY "workspace_tokens_update" ON workspace_tokens FOR UPDATE USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_tokens.workspace_id AND w.user_id = auth.uid())
);
CREATE POLICY "workspace_tokens_delete" ON workspace_tokens FOR DELETE USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_tokens.workspace_id AND w.user_id = auth.uid())
);

-- --- workspace_artifacts ---
CREATE TABLE IF NOT EXISTS workspace_artifacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id),
  card_id         UUID REFERENCES nexus_cards(id),
  card_ref        TEXT,
  file_type       TEXT NOT NULL CHECK (file_type = ANY(ARRAY['code','document','data','media','config','other'])),
  filename        TEXT NOT NULL,
  storage_path    TEXT NOT NULL,
  file_hash       TEXT,
  file_size_bytes BIGINT,
  version         INTEGER NOT NULL DEFAULT 1,
  staged          BOOLEAN NOT NULL DEFAULT true,
  agent_id        UUID REFERENCES bender_identities(id),
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE workspace_artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_artifacts_select" ON workspace_artifacts FOR SELECT USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_artifacts.workspace_id AND w.user_id = auth.uid())
);
CREATE POLICY "workspace_artifacts_insert" ON workspace_artifacts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
);

-- --- workspace_audit_events (append-only) ---
CREATE TABLE IF NOT EXISTS workspace_audit_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  event_type   TEXT NOT NULL,
  actor        TEXT NOT NULL DEFAULT 'system',
  entity_type  TEXT,
  entity_id    TEXT,
  payload      JSONB NOT NULL DEFAULT '{}',
  outcome      TEXT CHECK (outcome = ANY(ARRAY['success','failure','rejected'])),
  ip_address   INET,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE workspace_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_audit_events_select" ON workspace_audit_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_audit_events.workspace_id AND w.user_id = auth.uid())
);
CREATE POLICY "workspace_audit_events_insert" ON workspace_audit_events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
);

-- --- wisdom_docs ---
CREATE TABLE IF NOT EXISTS wisdom_docs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path  TEXT NOT NULL UNIQUE,
  title      TEXT,
  domain     signal_domain,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id    UUID NOT NULL REFERENCES auth.users(id)
);
ALTER TABLE wisdom_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wisdom_docs_select" ON wisdom_docs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "wisdom_docs_insert" ON wisdom_docs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "wisdom_docs_update" ON wisdom_docs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "wisdom_docs_delete" ON wisdom_docs FOR DELETE USING (user_id = auth.uid());

-- --- learning_signals (append-only) ---
CREATE TABLE IF NOT EXISTS learning_signals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_version        TEXT NOT NULL DEFAULT 'v1',
  task_id               TEXT,
  card_id               TEXT,
  agent_id              TEXT NOT NULL,
  identity_slug         TEXT NOT NULL,
  project               TEXT NOT NULL,
  domain                signal_domain NOT NULL,
  tags                  TEXT[],
  expected              TEXT NOT NULL,
  actual                TEXT NOT NULL,
  delta                 TEXT,
  friction              TEXT,
  discovery             TEXT,
  recommendation        TEXT NOT NULL,
  context_loaded        TEXT[],
  context_helpful       TEXT[],
  context_missing       TEXT,
  context_irrelevant    TEXT[],
  briefing_received     BOOLEAN,
  briefing_accurate     BOOLEAN,
  briefing_feedback     TEXT,
  severity              TEXT NOT NULL CHECK (severity = ANY(ARRAY['low','medium','high'])),
  contributed_to_wisdom_id UUID REFERENCES wisdom_docs(id),
  superseded_by         UUID REFERENCES learning_signals(id) DEFERRABLE INITIALLY DEFERRED,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id               UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id)
);
ALTER TABLE learning_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "learning_signals_select" ON learning_signals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "learning_signals_insert" ON learning_signals FOR INSERT WITH CHECK (user_id = auth.uid());
-- No UPDATE/DELETE policies — table is append-only (enforced by trigger)

-- --- signal_context_feedback ---
CREATE TABLE IF NOT EXISTS signal_context_feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id  UUID NOT NULL REFERENCES learning_signals(id),
  doc_path   TEXT NOT NULL,
  assessment TEXT NOT NULL CHECK (assessment = ANY(ARRAY['helpful','irrelevant','missing'])),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE signal_context_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signal_context_feedback_select" ON signal_context_feedback FOR SELECT USING (
  EXISTS (SELECT 1 FROM learning_signals ls WHERE ls.id = signal_context_feedback.signal_id AND ls.user_id = auth.uid())
);
CREATE POLICY "signal_context_feedback_insert" ON signal_context_feedback FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM learning_signals ls WHERE ls.id = signal_id AND ls.user_id = auth.uid())
);

-- --- audit_log (append-only) ---
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    TEXT NOT NULL,
  action      TEXT NOT NULL,
  category    TEXT NOT NULL,
  actor       TEXT NOT NULL DEFAULT 'system',
  actor_type  TEXT NOT NULL DEFAULT 'system',
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  project_id  UUID REFERENCES nexus_projects(id),
  card_id     TEXT,
  old_value   JSONB,
  new_value   JSONB,
  metadata    JSONB DEFAULT '{}',
  source      TEXT NOT NULL DEFAULT 'trigger',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id)
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT WITH CHECK (user_id = auth.uid());
-- No UPDATE/DELETE policies — table is append-only (enforced by trigger)

-- --- routing_config ---
CREATE TABLE IF NOT EXISTS routing_config (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  user_id     UUID NOT NULL REFERENCES auth.users(id)
);
ALTER TABLE routing_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "routing_config_select" ON routing_config FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "routing_config_insert" ON routing_config FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "routing_config_update" ON routing_config FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "routing_config_delete" ON routing_config FOR DELETE USING (user_id = auth.uid());

-- --- task_type_routing ---
CREATE TABLE IF NOT EXISTS task_type_routing (
  task_type           TEXT PRIMARY KEY,
  default_model       TEXT REFERENCES model_library(slug),
  is_governance       BOOLEAN DEFAULT false,
  description         TEXT,
  auto_switch         BOOLEAN DEFAULT false,
  stakes_level        TEXT DEFAULT 'medium' CHECK (stakes_level = ANY(ARRAY['low','medium','high','critical'])),
  override_model      TEXT REFERENCES model_library(slug),
  override_reason     TEXT,
  override_expires_at TIMESTAMPTZ,
  execution_mode      TEXT NOT NULL DEFAULT 'claude_task' CHECK (execution_mode = ANY(ARRAY['claude_task','gemini_api','gemini_cli'])),
  user_id             UUID NOT NULL REFERENCES auth.users(id)
);
ALTER TABLE task_type_routing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_type_routing_select" ON task_type_routing FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "task_type_routing_insert" ON task_type_routing FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "task_type_routing_update" ON task_type_routing FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "task_type_routing_delete" ON task_type_routing FOR DELETE USING (user_id = auth.uid());

-- --- user_settings ---
CREATE TABLE IF NOT EXISTS user_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  value       JSONB NOT NULL DEFAULT '""',
  category    TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  user_id     UUID NOT NULL REFERENCES auth.users(id)
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_settings_select" ON user_settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_settings_insert" ON user_settings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_settings_update" ON user_settings FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "user_settings_delete" ON user_settings FOR DELETE USING (user_id = auth.uid());

-- --- user_learnings ---
CREATE TABLE IF NOT EXISTS user_learnings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID REFERENCES projects(id),
  category       TEXT NOT NULL CHECK (category = ANY(ARRAY['communication','preferences','voice','workflow','technical','domain'])),
  key            TEXT NOT NULL,
  value          JSONB NOT NULL,
  confidence     NUMERIC DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  evidence_count INTEGER DEFAULT 1,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  user_id        UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE (project_id, category, key)
);
ALTER TABLE user_learnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_learnings_select" ON user_learnings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_learnings_insert" ON user_learnings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_learnings_update" ON user_learnings FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "user_learnings_delete" ON user_learnings FOR DELETE USING (user_id = auth.uid());

-- --- inbox_items ---
CREATE TABLE IF NOT EXISTS inbox_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename       TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  type           TEXT NOT NULL CHECK (type = ANY(ARRAY['note','link','file','instruction'])),
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status = ANY(ARRAY['pending','processing','done','archived','dismissed'])),
  created        TIMESTAMPTZ NOT NULL DEFAULT now(),
  source         TEXT NOT NULL DEFAULT 'webapp',
  content        TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  project_id     UUID REFERENCES nexus_projects(id),
  priority       TEXT DEFAULT 'normal' CHECK (priority = ANY(ARRAY['critical','high','normal','low'])),
  file_path      TEXT,
  file_size      INTEGER,
  mime_type      TEXT,
  linked_card_id UUID REFERENCES nexus_cards(id),
  assigned_to    TEXT,
  tags           TEXT[] DEFAULT '{}',
  user_id        UUID NOT NULL REFERENCES auth.users(id)
);
ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inbox_items_select" ON inbox_items FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "inbox_items_insert" ON inbox_items FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "inbox_items_update" ON inbox_items FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "inbox_items_delete" ON inbox_items FOR DELETE USING (user_id = auth.uid());

-- --- canvases ---
CREATE TABLE IF NOT EXISTS canvases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL DEFAULT 'Untitled',
  description TEXT,
  data        JSONB NOT NULL DEFAULT '{}',
  thumbnail   TEXT,
  project_id  UUID REFERENCES projects(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id     UUID REFERENCES auth.users(id)
);
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "canvases_select" ON canvases FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "canvases_insert" ON canvases FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "canvases_update" ON canvases FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "canvases_delete" ON canvases FOR DELETE USING (user_id = auth.uid());

-- --- workflows ---
CREATE TABLE IF NOT EXISTS workflows (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID REFERENCES projects(id),
  slug           TEXT NOT NULL,
  title          TEXT NOT NULL,
  workflow_type  TEXT NOT NULL,
  trigger        TEXT,
  status         TEXT DEFAULT 'active',
  purpose        TEXT,
  sections       JSONB,
  prerequisites  TEXT[],
  markdown_path  TEXT NOT NULL,
  name           TEXT,
  skill          TEXT,
  created        TEXT,
  file_path      TEXT,
  layer          TEXT,
  chain_next     UUID REFERENCES workflows(id) DEFERRABLE INITIALLY DEFERRED,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  user_id        UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE (project_id, slug)
);
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflows_select" ON workflows FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "workflows_insert" ON workflows FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "workflows_update" ON workflows FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "workflows_delete" ON workflows FOR DELETE USING (user_id = auth.uid());

-- ===========================================================================
-- TRIGGERS
-- ===========================================================================

-- audit_log: immutability (block UPDATE + DELETE)
DROP TRIGGER IF EXISTS trg_audit_log_immutable ON audit_log;
CREATE TRIGGER trg_audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

-- learning_signals: append-only
DROP TRIGGER IF EXISTS trg_block_signal_update ON learning_signals;
CREATE TRIGGER trg_block_signal_update
  BEFORE UPDATE ON learning_signals
  FOR EACH ROW EXECUTE FUNCTION fn_block_signal_update();

-- workspace_audit_events: append-only
DROP TRIGGER IF EXISTS trg_workspace_audit_immutability ON workspace_audit_events;
CREATE TRIGGER trg_workspace_audit_immutability
  BEFORE DELETE ON workspace_audit_events
  FOR EACH ROW EXECUTE FUNCTION enforce_workspace_audit_immutability();

-- nexus_cards: BEFORE INSERT
DROP TRIGGER IF EXISTS nexus_card_auto_id ON nexus_cards;
CREATE TRIGGER nexus_card_auto_id
  BEFORE INSERT ON nexus_cards
  FOR EACH ROW EXECUTE FUNCTION nexus_generate_card_id();

DROP TRIGGER IF EXISTS trg_validate_assigned_to ON nexus_cards;
CREATE TRIGGER trg_validate_assigned_to
  BEFORE INSERT ON nexus_cards
  FOR EACH ROW EXECUTE FUNCTION validate_assigned_to();

DROP TRIGGER IF EXISTS trg_validate_parent_epic ON nexus_cards;
CREATE TRIGGER trg_validate_parent_epic
  BEFORE INSERT ON nexus_cards
  FOR EACH ROW EXECUTE FUNCTION validate_parent_epic();

-- nexus_cards: BEFORE UPDATE
DROP TRIGGER IF EXISTS nexus_card_reset_rfp ON nexus_cards;
CREATE TRIGGER nexus_card_reset_rfp
  BEFORE UPDATE ON nexus_cards
  FOR EACH ROW EXECUTE FUNCTION nexus_reset_ready_for_production();

DROP TRIGGER IF EXISTS trg_nexus_cards_version ON nexus_cards;
CREATE TRIGGER trg_nexus_cards_version
  BEFORE UPDATE ON nexus_cards
  FOR EACH ROW EXECUTE FUNCTION nexus_cards_increment_version();

DROP TRIGGER IF EXISTS trg_validate_lane_transition ON nexus_cards;
CREATE TRIGGER trg_validate_lane_transition
  BEFORE UPDATE ON nexus_cards
  FOR EACH ROW EXECUTE FUNCTION validate_lane_transition();

DROP TRIGGER IF EXISTS trg_validate_blocked_by ON nexus_cards;
CREATE TRIGGER trg_validate_blocked_by
  BEFORE UPDATE ON nexus_cards
  FOR EACH ROW EXECUTE FUNCTION validate_blocked_by();

DROP TRIGGER IF EXISTS trg_enforce_delegation ON nexus_cards;
CREATE TRIGGER trg_enforce_delegation
  BEFORE UPDATE ON nexus_cards
  FOR EACH ROW EXECUTE FUNCTION enforce_delegation();

DROP TRIGGER IF EXISTS trg_auto_flag_for_production ON nexus_cards;
CREATE TRIGGER trg_auto_flag_for_production
  BEFORE UPDATE ON nexus_cards
  FOR EACH ROW EXECUTE FUNCTION auto_flag_for_production();

DROP TRIGGER IF EXISTS trg_preflight_gate ON nexus_cards;
CREATE TRIGGER trg_preflight_gate
  BEFORE UPDATE ON nexus_cards
  FOR EACH ROW EXECUTE FUNCTION fn_preflight_gate();

DROP TRIGGER IF EXISTS trg_learning_gate ON nexus_cards;
CREATE TRIGGER trg_learning_gate
  BEFORE UPDATE ON nexus_cards
  FOR EACH ROW EXECUTE FUNCTION fn_learning_gate();

DROP TRIGGER IF EXISTS trg_audit_card_updated ON nexus_cards;
CREATE TRIGGER trg_audit_card_updated
  BEFORE UPDATE ON nexus_cards
  FOR EACH ROW EXECUTE FUNCTION audit_card_updated();

DROP TRIGGER IF EXISTS trg_audit_card_rfp ON nexus_cards;
CREATE TRIGGER trg_audit_card_rfp
  BEFORE UPDATE ON nexus_cards
  FOR EACH ROW EXECUTE FUNCTION audit_card_rfp();

-- nexus_cards: AFTER INSERT
DROP TRIGGER IF EXISTS trg_audit_card_created ON nexus_cards;
CREATE TRIGGER trg_audit_card_created
  AFTER INSERT ON nexus_cards
  FOR EACH ROW EXECUTE FUNCTION audit_card_created();

DROP TRIGGER IF EXISTS trg_comment_on_card_created ON nexus_cards;
CREATE TRIGGER trg_comment_on_card_created
  AFTER INSERT ON nexus_cards
  FOR EACH ROW EXECUTE FUNCTION comment_on_card_created();

-- nexus_cards: AFTER UPDATE
DROP TRIGGER IF EXISTS trg_auto_comment_lane_change ON nexus_cards;
CREATE TRIGGER trg_auto_comment_lane_change
  AFTER UPDATE ON nexus_cards
  FOR EACH ROW EXECUTE FUNCTION auto_comment_lane_change();

DROP TRIGGER IF EXISTS trg_bender_done_pending_score ON nexus_cards;
CREATE TRIGGER trg_bender_done_pending_score
  AFTER UPDATE ON nexus_cards
  FOR EACH ROW EXECUTE FUNCTION bender_done_create_pending_score();

DROP TRIGGER IF EXISTS trg_surface_autofill ON nexus_cards;
CREATE TRIGGER trg_surface_autofill
  AFTER UPDATE ON nexus_cards
  FOR EACH ROW EXECUTE FUNCTION fn_surface_autofill();

-- nexus_comments
DROP TRIGGER IF EXISTS trg_audit_comment_created ON nexus_comments;
CREATE TRIGGER trg_audit_comment_created
  AFTER INSERT ON nexus_comments
  FOR EACH ROW EXECUTE FUNCTION audit_comment_created();

DROP TRIGGER IF EXISTS trg_question_comment_notification ON nexus_comments;
CREATE TRIGGER trg_question_comment_notification
  AFTER INSERT ON nexus_comments
  FOR EACH ROW EXECUTE FUNCTION notify_question_comment();

-- nexus_locks
DROP TRIGGER IF EXISTS trg_audit_lock_event ON nexus_locks;
CREATE TRIGGER trg_audit_lock_event
  AFTER INSERT ON nexus_locks
  FOR EACH ROW EXECUTE FUNCTION audit_lock_event();

-- nexus_projects
DROP TRIGGER IF EXISTS trg_audit_project ON nexus_projects;
CREATE TRIGGER trg_audit_project
  AFTER INSERT OR UPDATE OR DELETE ON nexus_projects
  FOR EACH ROW EXECUTE FUNCTION audit_project_change();

-- nexus_sprints
DROP TRIGGER IF EXISTS trg_audit_sprint ON nexus_sprints;
CREATE TRIGGER trg_audit_sprint
  AFTER INSERT OR UPDATE ON nexus_sprints
  FOR EACH ROW EXECUTE FUNCTION audit_sprint_change();

-- nexus_workstreams
DROP TRIGGER IF EXISTS trg_audit_workstream ON nexus_workstreams;
CREATE TRIGGER trg_audit_workstream
  AFTER INSERT OR UPDATE OR DELETE ON nexus_workstreams
  FOR EACH ROW EXECUTE FUNCTION audit_workstream_change();

-- bender_tasks
DROP TRIGGER IF EXISTS trg_audit_bender_task ON bender_tasks;
CREATE TRIGGER trg_audit_bender_task
  AFTER INSERT OR UPDATE OR DELETE ON bender_tasks
  FOR EACH ROW EXECUTE FUNCTION audit_bender_task_change();

DROP TRIGGER IF EXISTS trg_sync_agent_session ON bender_tasks;
CREATE TRIGGER trg_sync_agent_session
  AFTER INSERT ON bender_tasks
  FOR EACH ROW EXECUTE FUNCTION sync_agent_session_from_task();

-- bender_teams
DROP TRIGGER IF EXISTS trg_audit_team ON bender_teams;
CREATE TRIGGER trg_audit_team
  AFTER INSERT OR UPDATE OR DELETE ON bender_teams
  FOR EACH ROW EXECUTE FUNCTION audit_team_change();

-- project_tech_stack
DROP TRIGGER IF EXISTS trg_tech_stack_updated ON project_tech_stack;
CREATE TRIGGER trg_tech_stack_updated
  BEFORE UPDATE ON project_tech_stack
  FOR EACH ROW EXECUTE FUNCTION update_tech_stack_timestamp();

-- project_workflows
DROP TRIGGER IF EXISTS trg_workflows_updated ON project_workflows;
CREATE TRIGGER trg_workflows_updated
  BEFORE UPDATE ON project_workflows
  FOR EACH ROW EXECUTE FUNCTION update_workflows_timestamp();

-- user_settings
DROP TRIGGER IF EXISTS trg_audit_setting ON user_settings;
CREATE TRIGGER trg_audit_setting
  AFTER INSERT OR UPDATE OR DELETE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION audit_setting_change();

DROP TRIGGER IF EXISTS trg_user_settings_updated ON user_settings;
CREATE TRIGGER trg_user_settings_updated
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_user_settings_timestamp();

-- workspace_scope
DROP TRIGGER IF EXISTS trg_workspace_scope_updated_at ON workspace_scope;
CREATE TRIGGER trg_workspace_scope_updated_at
  BEFORE UPDATE ON workspace_scope
  FOR EACH ROW EXECUTE FUNCTION update_workspace_scope_updated_at();

-- workspaces
DROP TRIGGER IF EXISTS trg_workspaces_updated_at ON workspaces;
CREATE TRIGGER trg_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_workspaces_updated_at();

-- ===========================================================================
-- RPC: create_nexus_card
-- ===========================================================================
CREATE OR REPLACE FUNCTION create_nexus_card(
  p_project_slug          text,
  p_title                 text,
  p_card_type             text    DEFAULT 'task',
  p_summary               text    DEFAULT NULL,
  p_lane                  text    DEFAULT 'backlog',
  p_priority              text    DEFAULT 'normal',
  p_delegation_tag        text    DEFAULT 'DEA',
  p_delegation_justification text DEFAULT NULL,
  p_assigned_to           text    DEFAULT NULL,
  p_assigned_model        text    DEFAULT NULL,
  p_source                text    DEFAULT NULL,
  p_parent_card_id        text    DEFAULT NULL,
  p_tags                  text[]  DEFAULT '{}',
  p_bender_lane           text    DEFAULT NULL,
  p_overview              text    DEFAULT NULL,
  p_requirements          text    DEFAULT NULL,
  p_acceptance_criteria   text    DEFAULT NULL,
  p_deliverables          text    DEFAULT NULL,
  p_constraints           text    DEFAULT NULL,
  p_framework_ids         text[]  DEFAULT NULL
) RETURNS TABLE(out_card_id text, out_card_uuid uuid, out_project_slug text)
LANGUAGE plpgsql AS $$
DECLARE
  v_project_id UUID; v_parent_uuid UUID; v_card_uuid UUID; v_card_id TEXT;
  v_valid_lanes TEXT[] := ARRAY['backlog','ready','in_progress','review','done','ideas','drafts','unpublished','published','archive'];
  v_valid_card_types TEXT[] := ARRAY['epic','task','bug','chore','research','article'];
  v_valid_priorities TEXT[] := ARRAY['critical','high','normal','low'];
  v_valid_delegation TEXT[] := ARRAY['BENDER','DEA'];
  v_valid_bender_lanes TEXT[] := ARRAY['proposed','queued','executing','delivered','integrated'];
  v_bender_retired_at TIMESTAMPTZ;
BEGIN
  SET search_path TO 'public';
  IF p_title IS NULL OR trim(p_title) = '' THEN RAISE EXCEPTION 'p_title is required'; END IF;
  IF p_card_type != ALL(v_valid_card_types) THEN RAISE EXCEPTION 'Invalid card_type: %', p_card_type; END IF;
  IF p_lane != ALL(v_valid_lanes) THEN RAISE EXCEPTION 'Invalid lane: %', p_lane; END IF;
  IF p_priority != ALL(v_valid_priorities) THEN RAISE EXCEPTION 'Invalid priority: %', p_priority; END IF;
  IF p_delegation_tag != ALL(v_valid_delegation) THEN RAISE EXCEPTION 'Invalid delegation_tag: %', p_delegation_tag; END IF;
  IF p_bender_lane IS NOT NULL AND p_bender_lane != ALL(v_valid_bender_lanes) THEN
    RAISE EXCEPTION 'Invalid bender_lane: %', p_bender_lane; END IF;
  IF p_assigned_to IS NOT NULL THEN
    SELECT retired_at INTO v_bender_retired_at FROM bender_identities WHERE slug = p_assigned_to;
    IF NOT FOUND THEN RAISE EXCEPTION 'assigned_to "%" not a valid bender slug', p_assigned_to; END IF;
    IF v_bender_retired_at IS NOT NULL THEN RAISE EXCEPTION 'assigned_to "%" is retired', p_assigned_to; END IF;
  END IF;
  SELECT id INTO v_project_id FROM nexus_projects WHERE slug = p_project_slug;
  IF v_project_id IS NULL THEN RAISE EXCEPTION 'Unknown project_slug: %', p_project_slug; END IF;
  IF p_parent_card_id IS NOT NULL THEN
    SELECT id INTO v_parent_uuid FROM nexus_cards WHERE card_id = p_parent_card_id;
    IF v_parent_uuid IS NULL THEN RAISE EXCEPTION 'Parent card not found: %', p_parent_card_id; END IF;
  END IF;
  INSERT INTO nexus_cards (project_id, parent_id, title, summary, card_type, lane, bender_lane,
    priority, delegation_tag, delegation_justification, assigned_to, assigned_model, source, tags, framework_ids)
  VALUES (v_project_id, v_parent_uuid, trim(p_title), normalize_newlines(p_summary),
    p_card_type, p_lane, p_bender_lane, p_priority, p_delegation_tag,
    normalize_newlines(p_delegation_justification), p_assigned_to, p_assigned_model,
    p_source, COALESCE(p_tags,'{}'), p_framework_ids::nexus_framework_id[])
  RETURNING id, card_id INTO v_card_uuid, v_card_id;
  IF p_overview IS NOT NULL THEN
    INSERT INTO nexus_task_details (card_id, overview, requirements, acceptance_criteria, deliverables, constraints)
    VALUES (v_card_uuid, normalize_newlines(p_overview), normalize_newlines(p_requirements),
      normalize_newlines(p_acceptance_criteria), normalize_newlines(p_deliverables), normalize_newlines(p_constraints));
  END IF;
  RETURN QUERY SELECT v_card_id, v_card_uuid, p_project_slug;
END;
$$;

-- ===========================================================================
-- MANAGEMENT TABLES
-- ===========================================================================
CREATE TABLE IF NOT EXISTS _schema_meta (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS _migration_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_version TEXT NOT NULL,
  migration_name    TEXT NOT NULL,
  applied_by        TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('success','failed','rolled-back')),
  duration_ms       INTEGER,
  error_message     TEXT,
  applied_at        TIMESTAMPTZ DEFAULT now()
);

-- Seed initial schema version
INSERT INTO _schema_meta (key, value) VALUES
  ('schema_version',  '2026-02-25.1'),
  ('last_migration',  '000_product_baseline'),
  ('provisioned_at',  now()::text)
ON CONFLICT (key) DO NOTHING;

-- ===========================================================================
-- SEED DATA: nexus_lane_transitions (24 rows)
-- ===========================================================================
INSERT INTO nexus_lane_transitions (id, lane_type, from_lane, to_lane) VALUES
  ('13616be2-b39e-41bd-ba10-6dce405619e6', 'standard', 'backlog',    'ready'),
  ('75e21633-d31d-4660-8b0c-c1f2715abcd4', 'bender',   'delivered',  'executing'),
  ('952a50a0-bd98-4d14-89f7-7185a03d4c89', 'bender',   'delivered',  'integrated'),
  ('896b0672-abff-4076-bcd1-7d2cde0efaef', 'standard', 'done',       'in_progress'),
  ('3d597861-af28-4b3f-ba31-a99a21a92267', 'standard', 'drafts',     'backlog'),
  ('4b86db03-5e85-44a0-ae26-d1f80de69757', 'standard', 'drafts',     'in_progress'),
  ('16f05dc5-1996-47c8-83c7-7f81e89cae6c', 'standard', 'drafts',     'published'),
  ('f71393a8-2046-454f-af78-4e02563b1a9a', 'standard', 'drafts',     'unpublished'),
  ('a2924bb4-765c-4195-8ee4-2ecbf21406b4', 'bender',   'executing',  'delivered'),
  ('493068a5-6323-4633-970e-1a0d0ae8d50d', 'standard', 'ideas',      'backlog'),
  ('75cf0aff-332d-4a2c-810a-2d90e9eb6987', 'standard', 'ideas',      'drafts'),
  ('0d55cd2e-4b4f-40ea-b2c1-2c61cb63346a', 'standard', 'in_progress','published'),
  ('515edca3-a6d3-48ad-9bf7-ad3ea58abe1b', 'standard', 'in_progress','ready'),
  ('c0238336-6ad4-41e6-a52d-b0c63e9565f5', 'standard', 'in_progress','review'),
  ('c9df0b1f-8145-441f-943d-6698dbc141a1', 'standard', 'in_progress','unpublished'),
  ('dd2f48c5-9dd1-4396-ba95-a21f4721a892', 'bender',   'proposed',   'queued'),
  ('6b443d38-0ef2-43b0-a4f8-42a3c0b8d8e0', 'bender',   'queued',     'executing'),
  ('af6c51fd-da93-4538-928b-719bb7460dcf', 'bender',   'queued',     'proposed'),
  ('1637e1f4-4cdd-4873-ae26-2e045228b927', 'standard', 'ready',      'backlog'),
  ('fd1469f8-dd2e-4778-bead-b0c467737bb8', 'standard', 'ready',      'in_progress'),
  ('eb667b49-4d04-435f-a9ff-377919cc4250', 'standard', 'review',     'backlog'),
  ('861c7855-afc8-4535-80c0-7c369a8efadc', 'standard', 'review',     'done'),
  ('19c36017-bcbd-4eb2-959a-24f524346ed4', 'standard', 'review',     'in_progress'),
  ('03e67bef-479d-40c3-9dbe-0fa2567ec1bd', 'standard', 'unpublished','published')
ON CONFLICT (lane_type, from_lane, to_lane) DO NOTHING;

-- ===========================================================================
-- SEED DATA: model_library (4 rows)
-- ===========================================================================
INSERT INTO model_library
  (id, slug, provider, display_name, cost_tier, capabilities, is_active, escalates_to,
   context_length, input_price_per_mtok, output_price_per_mtok, latency_p50_ms,
   host_type, model_id, auto_route_eligible)
VALUES
  ('fb87f11c-95b3-4502-ac8e-82b1236d7559', 'claude-opus-4.5', 'anthropic', 'Claude Opus 4.5',
   9, ARRAY['governance','architecture'], true, NULL,
   200000, 15.00, 75.00, 3000, 'cloud', 'claude-opus-4-20250514', false),
  ('5f124f69-7dc3-4a7a-b5f7-a00f9ecf8a41', 'claude-sonnet-4.5', 'anthropic', 'Claude Sonnet 4.5',
   7, ARRAY['code','reasoning','review'], true, 'claude-opus-4.5',
   200000, 3.00, 15.00, 1500, 'cloud', 'claude-sonnet-4-20250514', true),
  ('64464e8a-7b1a-43cf-a28b-6e7f01a82a84', 'gemini-3-flash', 'google', 'Gemini 3.0 Flash',
   2, ARRAY['browser','fast','research'], true, 'gemini-3-pro',
   1000000, 0.10, 0.40, 400, 'cloud', 'gemini-2.0-flash', true),
  ('6ba6d8e3-bf32-4f04-b0b3-1510a5b5f03e', 'gemini-3-pro', 'google', 'Gemini 3.0 Pro',
   5, ARRAY['browser','code','reasoning'], true, 'claude-sonnet-4.5',
   1000000, 1.25, 10.00, 1200, 'cloud', 'gemini-2.5-pro', true)
ON CONFLICT (slug) DO UPDATE SET
  display_name           = EXCLUDED.display_name,
  cost_tier              = EXCLUDED.cost_tier,
  capabilities           = EXCLUDED.capabilities,
  context_length         = EXCLUDED.context_length,
  input_price_per_mtok   = EXCLUDED.input_price_per_mtok,
  output_price_per_mtok  = EXCLUDED.output_price_per_mtok,
  auto_route_eligible    = EXCLUDED.auto_route_eligible,
  updated_at             = now();

COMMIT;
