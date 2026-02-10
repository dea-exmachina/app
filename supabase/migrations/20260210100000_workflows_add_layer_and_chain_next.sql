-- CC-FE-005a: Add layer and chain_next columns to workflows table
-- Enables tier filtering and workflow chaining for Workflow Intelligence System

-- Add columns
ALTER TABLE workflows
ADD COLUMN IF NOT EXISTS layer TEXT,
ADD COLUMN IF NOT EXISTS chain_next UUID REFERENCES workflows(id);

-- Seed layer values (26 workflows)
-- Council: governance constructs
UPDATE workflows SET layer = 'council' WHERE slug IN ('council-review', 'hive-construct');

-- Operations: dea execution layer
UPDATE workflows SET layer = 'operations' WHERE slug IN (
  'bender-assign', 'bender-context-update', 'bender-review',
  'context-package-build', 'git-review',
  'session-consolidate', 'session-handoff', 'session-resume',
  'task-commit', 'task-interview',
  'template-creation', 'template-testing',
  'webapp-development', 'identity-setup'
);

-- Instance: per-user/project-specific
UPDATE workflows SET layer = 'instance' WHERE slug IN (
  'job-onboarding', 'job-quick-ops', 'job-search'
);

-- Infrastructure: cross-cutting tool/service workflows
UPDATE workflows SET layer = 'infrastructure' WHERE slug IN (
  'email-send',
  'frontend-slides-conversion', 'frontend-slides-creation',
  'pptx-brand-setup', 'pptx-carousel-generation',
  'pptx-layout-crud', 'pptx-slide-generation'
);

-- Catch any unassigned: default to operations
UPDATE workflows SET layer = 'operations' WHERE layer IS NULL;

-- Seed 5 chain pointers (workflow sequences)
UPDATE workflows SET chain_next = (SELECT id FROM workflows WHERE slug = 'template-testing')
  WHERE slug = 'template-creation';

UPDATE workflows SET chain_next = (SELECT id FROM workflows WHERE slug = 'bender-review')
  WHERE slug = 'bender-assign';

UPDATE workflows SET chain_next = (SELECT id FROM workflows WHERE slug = 'git-review')
  WHERE slug = 'bender-review';

UPDATE workflows SET chain_next = (SELECT id FROM workflows WHERE slug = 'pptx-slide-generation')
  WHERE slug = 'pptx-brand-setup';

UPDATE workflows SET chain_next = (SELECT id FROM workflows WHERE slug = 'job-search')
  WHERE slug = 'job-onboarding';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflows_layer ON workflows(layer);
CREATE INDEX IF NOT EXISTS idx_workflows_chain_next ON workflows(chain_next);
