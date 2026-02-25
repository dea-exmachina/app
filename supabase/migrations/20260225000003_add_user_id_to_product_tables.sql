-- [admin] Phase 2 — Add user_id to all product tables in admin DB
-- Makes admin DB schema-identical to user DBs (single canonical schema)
-- Applies to: dea-exmachina-admin (hehldpjqlxhshdqqadng)
-- Created: 2026-02-25
--
-- Strategy:
--   1. ADD COLUMN user_id UUID (nullable)
--   2. UPDATE — backfill with dea-admin UUID (73036f4e-6024-49cb-91b4-0c8c2b9086d6)
--      This is dea-admin@dea-exmachina.xyz in THIS DB's auth.users
--   3. ALTER COLUMN SET NOT NULL
--   4. ADD FK REFERENCES auth.users(id)
--   NO RLS — admin DB is single-tenant; RLS only added in user DBs
--
-- Tables already having user_id (skipped): canvases
-- Tables with via:* tenancy (no user_id needed): nexus_cards, nexus_comments,
--   nexus_events, nexus_task_details, nexus_context_packages, nexus_agent_sessions,
--   nexus_locks, nexus_card_reopens, nexus_token_usage, bender_team_members,
--   identity_project_context, identity_recommendations, nexus_routing_rules,
--   project_benders, project_tech_stack, project_workflows, signal_context_feedback,
--   workspace_scope, workspace_sessions, workspace_tokens, workspace_artifacts,
--   workspace_audit_events

BEGIN;

-- Admin user UUID in this DB's auth.users
-- dea-admin@dea-exmachina.xyz → 73036f4e-6024-49cb-91b4-0c8c2b9086d6
DO $$
DECLARE
  admin_uuid UUID := '73036f4e-6024-49cb-91b4-0c8c2b9086d6';
BEGIN

  -- ===========================================================================
  -- 1. audit_log — IMMUTABLE TABLE (trg_audit_log_immutable blocks UPDATE/DELETE)
  -- Add column with NOT NULL DEFAULT to fill existing rows at DDL time.
  -- Postgres fills rows inline during column-add, bypassing row triggers.
  -- Keep DEFAULT so future admin inserts don't require explicit user_id.
  -- ===========================================================================
  ALTER TABLE audit_log
    ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL
    DEFAULT '73036f4e-6024-49cb-91b4-0c8c2b9086d6';
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'audit_log' AND constraint_name = 'audit_log_user_id_fkey'
  ) THEN
    ALTER TABLE audit_log ADD CONSTRAINT audit_log_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- ===========================================================================
  -- 2. bender_identities
  -- ===========================================================================
  ALTER TABLE bender_identities ADD COLUMN IF NOT EXISTS user_id UUID;
  UPDATE bender_identities SET user_id = admin_uuid WHERE user_id IS NULL;
  ALTER TABLE bender_identities ALTER COLUMN user_id SET NOT NULL;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'bender_identities' AND constraint_name = 'bender_identities_user_id_fkey'
  ) THEN
    ALTER TABLE bender_identities ADD CONSTRAINT bender_identities_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- ===========================================================================
  -- 3. bender_performance
  -- ===========================================================================
  ALTER TABLE bender_performance ADD COLUMN IF NOT EXISTS user_id UUID;
  UPDATE bender_performance SET user_id = admin_uuid WHERE user_id IS NULL;
  ALTER TABLE bender_performance ALTER COLUMN user_id SET NOT NULL;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'bender_performance' AND constraint_name = 'bender_performance_user_id_fkey'
  ) THEN
    ALTER TABLE bender_performance ADD CONSTRAINT bender_performance_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- ===========================================================================
  -- 4. bender_tasks
  -- ===========================================================================
  ALTER TABLE bender_tasks ADD COLUMN IF NOT EXISTS user_id UUID;
  UPDATE bender_tasks SET user_id = admin_uuid WHERE user_id IS NULL;
  ALTER TABLE bender_tasks ALTER COLUMN user_id SET NOT NULL;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'bender_tasks' AND constraint_name = 'bender_tasks_user_id_fkey'
  ) THEN
    ALTER TABLE bender_tasks ADD CONSTRAINT bender_tasks_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- ===========================================================================
  -- 5. bender_teams
  -- ===========================================================================
  ALTER TABLE bender_teams ADD COLUMN IF NOT EXISTS user_id UUID;
  UPDATE bender_teams SET user_id = admin_uuid WHERE user_id IS NULL;
  ALTER TABLE bender_teams ALTER COLUMN user_id SET NOT NULL;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'bender_teams' AND constraint_name = 'bender_teams_user_id_fkey'
  ) THEN
    ALTER TABLE bender_teams ADD CONSTRAINT bender_teams_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- ===========================================================================
  -- 6. inbox_items
  -- ===========================================================================
  ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS user_id UUID;
  UPDATE inbox_items SET user_id = admin_uuid WHERE user_id IS NULL;
  ALTER TABLE inbox_items ALTER COLUMN user_id SET NOT NULL;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'inbox_items' AND constraint_name = 'inbox_items_user_id_fkey'
  ) THEN
    ALTER TABLE inbox_items ADD CONSTRAINT inbox_items_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- ===========================================================================
  -- 7. learning_signals — IMMUTABLE TABLE (trg_block_signal_update blocks UPDATE)
  -- Same approach as audit_log: NOT NULL DEFAULT at column-add time.
  -- ===========================================================================
  ALTER TABLE learning_signals
    ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL
    DEFAULT '73036f4e-6024-49cb-91b4-0c8c2b9086d6';
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'learning_signals' AND constraint_name = 'learning_signals_user_id_fkey'
  ) THEN
    ALTER TABLE learning_signals ADD CONSTRAINT learning_signals_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- ===========================================================================
  -- 8. nexus_alerts
  -- ===========================================================================
  ALTER TABLE nexus_alerts ADD COLUMN IF NOT EXISTS user_id UUID;
  UPDATE nexus_alerts SET user_id = admin_uuid WHERE user_id IS NULL;
  ALTER TABLE nexus_alerts ALTER COLUMN user_id SET NOT NULL;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'nexus_alerts' AND constraint_name = 'nexus_alerts_user_id_fkey'
  ) THEN
    ALTER TABLE nexus_alerts ADD CONSTRAINT nexus_alerts_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- ===========================================================================
  -- 9. nexus_projects
  -- ===========================================================================
  ALTER TABLE nexus_projects ADD COLUMN IF NOT EXISTS user_id UUID;
  UPDATE nexus_projects SET user_id = admin_uuid WHERE user_id IS NULL;
  ALTER TABLE nexus_projects ALTER COLUMN user_id SET NOT NULL;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'nexus_projects' AND constraint_name = 'nexus_projects_user_id_fkey'
  ) THEN
    ALTER TABLE nexus_projects ADD CONSTRAINT nexus_projects_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- ===========================================================================
  -- 10. nexus_sprints
  -- ===========================================================================
  ALTER TABLE nexus_sprints ADD COLUMN IF NOT EXISTS user_id UUID;
  UPDATE nexus_sprints SET user_id = admin_uuid WHERE user_id IS NULL;
  ALTER TABLE nexus_sprints ALTER COLUMN user_id SET NOT NULL;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'nexus_sprints' AND constraint_name = 'nexus_sprints_user_id_fkey'
  ) THEN
    ALTER TABLE nexus_sprints ADD CONSTRAINT nexus_sprints_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- ===========================================================================
  -- 11. nexus_workstreams
  -- ===========================================================================
  ALTER TABLE nexus_workstreams ADD COLUMN IF NOT EXISTS user_id UUID;
  UPDATE nexus_workstreams SET user_id = admin_uuid WHERE user_id IS NULL;
  ALTER TABLE nexus_workstreams ALTER COLUMN user_id SET NOT NULL;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'nexus_workstreams' AND constraint_name = 'nexus_workstreams_user_id_fkey'
  ) THEN
    ALTER TABLE nexus_workstreams ADD CONSTRAINT nexus_workstreams_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- ===========================================================================
  -- 12. projects
  -- ===========================================================================
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID;
  UPDATE projects SET user_id = admin_uuid WHERE user_id IS NULL;
  ALTER TABLE projects ALTER COLUMN user_id SET NOT NULL;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'projects' AND constraint_name = 'projects_user_id_fkey'
  ) THEN
    ALTER TABLE projects ADD CONSTRAINT projects_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- ===========================================================================
  -- 13. routing_config
  -- ===========================================================================
  ALTER TABLE routing_config ADD COLUMN IF NOT EXISTS user_id UUID;
  UPDATE routing_config SET user_id = admin_uuid WHERE user_id IS NULL;
  ALTER TABLE routing_config ALTER COLUMN user_id SET NOT NULL;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'routing_config' AND constraint_name = 'routing_config_user_id_fkey'
  ) THEN
    ALTER TABLE routing_config ADD CONSTRAINT routing_config_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- ===========================================================================
  -- 14. task_type_routing
  -- ===========================================================================
  ALTER TABLE task_type_routing ADD COLUMN IF NOT EXISTS user_id UUID;
  UPDATE task_type_routing SET user_id = admin_uuid WHERE user_id IS NULL;
  ALTER TABLE task_type_routing ALTER COLUMN user_id SET NOT NULL;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'task_type_routing' AND constraint_name = 'task_type_routing_user_id_fkey'
  ) THEN
    ALTER TABLE task_type_routing ADD CONSTRAINT task_type_routing_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- ===========================================================================
  -- 15. user_learnings
  -- ===========================================================================
  ALTER TABLE user_learnings ADD COLUMN IF NOT EXISTS user_id UUID;
  UPDATE user_learnings SET user_id = admin_uuid WHERE user_id IS NULL;
  ALTER TABLE user_learnings ALTER COLUMN user_id SET NOT NULL;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_learnings' AND constraint_name = 'user_learnings_user_id_fkey'
  ) THEN
    ALTER TABLE user_learnings ADD CONSTRAINT user_learnings_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- ===========================================================================
  -- 16. user_settings
  -- ===========================================================================
  ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS user_id UUID;
  UPDATE user_settings SET user_id = admin_uuid WHERE user_id IS NULL;
  ALTER TABLE user_settings ALTER COLUMN user_id SET NOT NULL;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_settings' AND constraint_name = 'user_settings_user_id_fkey'
  ) THEN
    ALTER TABLE user_settings ADD CONSTRAINT user_settings_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- ===========================================================================
  -- 17. wisdom_docs
  -- ===========================================================================
  ALTER TABLE wisdom_docs ADD COLUMN IF NOT EXISTS user_id UUID;
  UPDATE wisdom_docs SET user_id = admin_uuid WHERE user_id IS NULL;
  ALTER TABLE wisdom_docs ALTER COLUMN user_id SET NOT NULL;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'wisdom_docs' AND constraint_name = 'wisdom_docs_user_id_fkey'
  ) THEN
    ALTER TABLE wisdom_docs ADD CONSTRAINT wisdom_docs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- ===========================================================================
  -- 18. workflows
  -- ===========================================================================
  ALTER TABLE workflows ADD COLUMN IF NOT EXISTS user_id UUID;
  UPDATE workflows SET user_id = admin_uuid WHERE user_id IS NULL;
  ALTER TABLE workflows ALTER COLUMN user_id SET NOT NULL;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'workflows' AND constraint_name = 'workflows_user_id_fkey'
  ) THEN
    ALTER TABLE workflows ADD CONSTRAINT workflows_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- ===========================================================================
  -- 19. workspaces
  -- ===========================================================================
  ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS user_id UUID;
  UPDATE workspaces SET user_id = admin_uuid WHERE user_id IS NULL;
  ALTER TABLE workspaces ALTER COLUMN user_id SET NOT NULL;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'workspaces' AND constraint_name = 'workspaces_user_id_fkey'
  ) THEN
    ALTER TABLE workspaces ADD CONSTRAINT workspaces_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

END $$;

COMMIT;
