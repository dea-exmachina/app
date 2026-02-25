-- [admin] Populate _table_classification with all known tables
-- Phase 1.2 — Full classification per spec Section 3
-- Applies to: dea-exmachina-admin (hehldpjqlxhshdqqadng)
-- Created: 2026-02-25
--
-- Depends on: 20260225000001_classification_registry.sql
--
-- Classification legend:
--   product       → propagates to all user DBs (with user_id + RLS)
--   platform-seed → propagates as read-only seed data (reference tables)
--   admin         → never propagates (internal ops only)

BEGIN;

INSERT INTO _table_classification (table_name, classification, multi_tenant_key, notes) VALUES

-- ===========================================================================
-- PRODUCT TABLES — core dea-exmachina product schema
-- Propagate to every user DB with user_id column + RLS policies
-- ===========================================================================

-- Kanban core
('nexus_projects',          'product', 'user_id',          'Projects/workspaces — direct user_id FK'),
('nexus_cards',             'product', 'via:project_id',   'Task cards, epics, bugs — tenanted via project_id → user_id'),
('nexus_task_details',      'product', 'via:card_id',       'Card detail records — tenanted via card_id → project → user'),
('nexus_comments',          'product', 'via:card_id',       'Card discussion thread — tenanted via card_id → project → user'),
('nexus_events',            'product', 'via:card_id',       'Event stream per card — tenanted via card_id → project → user'),
('nexus_context_packages',  'product', 'via:card_id',       'Assembled context per card — tenanted via card_id → project → user'),
('nexus_agent_sessions',    'product', 'via:card_id',       'Agent execution sessions — tenanted via card_id → project → user'),
('nexus_locks',             'product', 'via:card_id',       'Concurrency locks — tenanted via card_id → project → user'),
('nexus_alerts',            'product', 'user_id',           'System alerts — direct user_id FK'),
('nexus_sprints',           'product', 'user_id',           'Sprint management — add user_id in Phase 2'),
('nexus_workstreams',       'product', 'user_id',           'Workstream grouping — add user_id in Phase 2'),
('nexus_card_reopens',      'product', 'via:card_id',       'Reopen tracking — tenanted via card_id → project → user'),
('nexus_token_usage',       'product', 'via:card_id',       'LLM cost tracking — tenanted via card_id → project → user'),
('nexus_routing_rules',     'product', 'via:project_id',   'Card routing keywords — tenanted via project_id → user'),

-- Audit
('audit_log',               'product', 'user_id',           'Immutable audit trail — add user_id in Phase 2'),

-- Bender / agent system
('bender_identities',       'product', 'user_id',           'Agent identity profiles — add user_id in Phase 2'),
('bender_performance',      'product', 'user_id',           'Agent scoring metrics — add user_id in Phase 2'),
('bender_teams',            'product', 'user_id',           'Agent team composition — add user_id in Phase 2'),
('bender_team_members',     'product', 'via:team_id',       'Team membership — tenanted via team_id → user'),
('bender_tasks',            'product', 'user_id',           'Delegated task records — add user_id in Phase 2'),
('project_benders',         'product', 'via:project_id',   'Agent↔project assignment — tenanted via project_id → user'),
('identity_recommendations','product', 'via:task_id',       'Agent match scores — tenanted via task_id → project → user'),
('identity_project_context','product', 'via:project_id',   'Agent context per project — tenanted via project_id → user'),

-- Learning pipeline
('learning_signals',        'product', 'user_id',           'Learning pipeline signals — add user_id in Phase 2'),
('signal_context_feedback', 'product', 'via:signal_id',    'Signal quality feedback — tenanted via signal_id → user'),
('wisdom_docs',             'product', 'user_id',           'Graduated learnings — add user_id in Phase 2'),

-- User data
('user_settings',           'product', 'user_id',           'User preferences — direct user_id FK'),
('user_learnings',          'product', 'user_id',           'User behavioral learnings — add user_id in Phase 2'),

-- Workspaces
('workspaces',              'product', 'user_id',           'Sandbox execution environments — add user_id in Phase 2'),
('workspace_scope',         'product', 'via:workspace_id', 'File scoping per workspace — tenanted via workspace_id → user'),
('workspace_sessions',      'product', 'via:workspace_id', 'Recorded shell sessions — tenanted via workspace_id → user'),
('workspace_tokens',        'product', 'via:workspace_id', 'Scoped JWT tokens — tenanted via workspace_id → user'),
('workspace_artifacts',     'product', 'via:workspace_id', 'Produced files/outputs — tenanted via workspace_id → user'),
('workspace_audit_events',  'product', 'via:workspace_id', 'Workspace audit trail — tenanted via workspace_id → user'),

-- Projects / productivity
('projects',                'product', 'user_id',           'Life/business projects — add user_id in Phase 2'),
('canvases',                'product', 'user_id',           'Visual canvases — direct user_id FK'),
('inbox_items',             'product', 'user_id',           'Triage queue — add user_id in Phase 2'),
('workflows',               'product', 'user_id',           'Automated workflow definitions — add user_id in Phase 2'),
('project_workflows',       'product', 'via:project_id',   'Workflow↔project links — tenanted via project_id → user'),
('project_tech_stack',      'product', 'via:project_id',   'Tech stack per project — tenanted via project_id → user'),

-- Routing
('task_type_routing',       'product', 'user_id',           'Model routing rules — seeded as defaults; user can override'),
('routing_config',          'product', 'user_id',           'Routing configuration — seeded as defaults; user can override'),

-- ===========================================================================
-- PLATFORM-SEED TABLES — propagate as read-only reference data
-- Users get a copy seeded on provisioning; platform updates via migrations
-- ===========================================================================

('model_library',           'platform-seed', 'platform-wide', 'Available LLM models + pricing. INSERT ON CONFLICT DO UPDATE on migration.'),
('skills',                  'platform-seed', 'platform-wide', 'System skill definitions. Read-only for users.'),
('project_templates',       'platform-seed', 'platform-wide', 'Starter project templates. Read-only for users.'),
('nexus_lane_transitions',  'platform-seed', 'platform-wide', 'Valid lane transition rules. Read-only for users.'),

-- ===========================================================================
-- ADMIN-ONLY TABLES — never propagate to user DBs
-- Internal ops, dev tooling, infrastructure, George-specific systems
-- ===========================================================================

-- Discord / webhooks
('discord_messages',        'admin', NULL, 'Discord webhook delivery log — internal notification system'),
('webhook_configs',         'admin', NULL, 'Webhook endpoint registry — admin infrastructure'),
('webhook_log',             'admin', NULL, 'Webhook delivery audit log — admin debugging'),
('webhook_health_log',      'admin', NULL, 'Webhook health canary — admin monitoring'),

-- Architecture / governance
('architecture_annotations','admin', NULL, 'System architecture notes — dev-team internal'),
('architecture_secrets',    'admin', NULL, 'Secret registry — dev-team internal, never propagated'),
('meta_constructs',         'admin', NULL, 'Council construct definitions — admin governance'),

-- Event bus / orchestration
('queen_events',            'admin', NULL, 'Orchestration events — internal event bus'),
('sync_state',              'admin', NULL, 'External sync tracking — admin integration state'),

-- Research (admin-specific feature)
('research_subscriptions',  'admin', NULL, 'Research report configuration — admin-specific feature'),
('research_reports',        'admin', NULL, 'Generated research reports — admin-specific feature'),

-- Release / sprint (admin CI/CD and project management)
('release_runs',            'admin', NULL, 'Release pipeline state — admin CI/CD'),
('sprint_reviews',          'admin', NULL, 'Sprint retrospectives — admin project management'),
('nexus_council_reviews',   'admin', NULL, 'Council review sessions — admin governance'),

-- Monitoring / performance
('dea_performance',         'admin', NULL, 'dea self-scoring — admin performance tracking'),
('supervisor_lenses',       'admin', NULL, 'Supervisor view configuration — admin tooling'),
('bender_platforms',        'admin', NULL, 'Platform definitions for bender execution — admin config'),
('agent_health',            'admin', NULL, 'Agent health monitoring — admin monitoring'),

-- Config (George-specific)
('user_config',             'admin', NULL, 'Admin key-value config — George-specific settings'),

-- This pipeline's own infrastructure
('_table_classification',   'admin', NULL, 'This registry — pipeline metadata, admin-only'),
('instance_registry',       'admin', NULL, 'User DB instance registry — platform ops, admin-only'),
('migration_log',           'admin', NULL, 'Platform migration audit log — admin-only')

ON CONFLICT (table_name) DO UPDATE SET
  classification   = EXCLUDED.classification,
  multi_tenant_key = EXCLUDED.multi_tenant_key,
  notes            = EXCLUDED.notes,
  updated_at       = now();

COMMIT;
