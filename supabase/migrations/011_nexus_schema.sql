-- NEXUS — Next-Gen Execution & Unified System (DEA-042)
-- Migration: 011_nexus_schema
-- Creates: nexus_projects, nexus_cards, nexus_task_details, nexus_comments,
--          nexus_locks, nexus_events, nexus_context_packages, nexus_agent_sessions
-- Triggers: card change events, comment events, lock events
-- Realtime: nexus_events, nexus_cards, nexus_comments, nexus_agent_sessions

-- ============================================================================
-- TABLE: nexus_projects
-- Project-level config, delegation policy, protected files.
-- ============================================================================
CREATE TABLE nexus_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  delegation_policy TEXT NOT NULL DEFAULT 'delegation-first'
    CHECK (delegation_policy IN ('dea-only', 'delegation-first')),
  override_reason TEXT,
  protected_paths TEXT[],
  repo_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE nexus_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON nexus_projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON nexus_projects
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLE: nexus_cards
-- The index object. Lightweight, scannable, links to everything.
-- ============================================================================
CREATE TABLE nexus_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id TEXT UNIQUE NOT NULL,
  project_id UUID REFERENCES nexus_projects(id),
  parent_id UUID REFERENCES nexus_cards(id),
  board TEXT NOT NULL,
  lane TEXT NOT NULL
    CHECK (lane IN ('inbox', 'handoff', 'planning', 'ready', 'in_progress', 'review', 'done',
                    'proposed', 'queued', 'executing', 'delivered', 'integrated')),
  title TEXT NOT NULL,
  summary TEXT,
  card_type TEXT NOT NULL
    CHECK (card_type IN ('epic', 'task', 'bug', 'chore', 'research', 'phase')),
  delegation_tag TEXT NOT NULL DEFAULT 'BENDER'
    CHECK (delegation_tag IN ('BENDER', 'DEA')),
  delegation_justification TEXT,
  assigned_to TEXT,
  assigned_model TEXT,
  priority TEXT DEFAULT 'normal'
    CHECK (priority IN ('critical', 'high', 'normal', 'low')),
  source TEXT,
  tags TEXT[],
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nexus_cards_board_lane ON nexus_cards(board, lane);
CREATE INDEX idx_nexus_cards_project ON nexus_cards(project_id);
CREATE INDEX idx_nexus_cards_parent ON nexus_cards(parent_id);
CREATE INDEX idx_nexus_cards_assigned ON nexus_cards(assigned_to);
CREATE INDEX idx_nexus_cards_card_id ON nexus_cards(card_id);

ALTER TABLE nexus_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON nexus_cards
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON nexus_cards
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE nexus_cards;

-- ============================================================================
-- TABLE: nexus_task_details
-- Rich detail layer (drill-down). One-to-one with cards that need full specs.
-- ============================================================================
CREATE TABLE nexus_task_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID UNIQUE REFERENCES nexus_cards(id) ON DELETE CASCADE,
  overview TEXT,
  requirements TEXT,
  acceptance_criteria TEXT,
  constraints TEXT,
  deliverables TEXT,
  "references" TEXT,
  branch TEXT DEFAULT 'dev',
  declared_scope TEXT[],
  actual_scope TEXT[],
  context_package_id UUID,
  execution_notes TEXT,
  review_decision TEXT
    CHECK (review_decision IN ('approved', 'needs_refinement', 'insufficient')),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE nexus_task_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON nexus_task_details
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON nexus_task_details
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLE: nexus_comments
-- JIRA-style threaded comments. dea + user only. Pivot/communication channel.
-- ============================================================================
CREATE TABLE nexus_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES nexus_cards(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  comment_type TEXT DEFAULT 'note'
    CHECK (comment_type IN ('note', 'pivot', 'question', 'directive')),
  is_pivot BOOLEAN DEFAULT false,
  pivot_impact TEXT
    CHECK (pivot_impact IN ('minor', 'major')),
  resolved BOOLEAN DEFAULT false,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nexus_comments_card ON nexus_comments(card_id);
CREATE INDEX idx_nexus_comments_pivot ON nexus_comments(card_id) WHERE is_pivot = true;

ALTER TABLE nexus_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON nexus_comments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON nexus_comments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE nexus_comments;

-- ============================================================================
-- TABLE: nexus_locks
-- Three-tier locking system: task, file, scope.
-- ============================================================================
CREATE TABLE nexus_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_type TEXT NOT NULL
    CHECK (lock_type IN ('task', 'file', 'scope')),
  card_id UUID REFERENCES nexus_cards(id),
  agent TEXT NOT NULL,
  target TEXT NOT NULL,
  acquired_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_nexus_locks_active ON nexus_locks(lock_type, target)
  WHERE released_at IS NULL;
CREATE INDEX idx_nexus_locks_agent ON nexus_locks(agent)
  WHERE released_at IS NULL;

ALTER TABLE nexus_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON nexus_locks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON nexus_locks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLE: nexus_events
-- Structured audit trail + event bus source.
-- ============================================================================
CREATE TABLE nexus_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  card_id UUID REFERENCES nexus_cards(id),
  actor TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nexus_events_card ON nexus_events(card_id);
CREATE INDEX idx_nexus_events_type ON nexus_events(event_type);
CREATE INDEX idx_nexus_events_time ON nexus_events(created_at DESC);

ALTER TABLE nexus_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON nexus_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON nexus_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE nexus_events;

-- ============================================================================
-- TABLE: nexus_context_packages
-- Pre-assembled context bundles for progressive disclosure.
-- ============================================================================
CREATE TABLE nexus_context_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES nexus_cards(id) ON DELETE CASCADE,
  layers JSONB NOT NULL,
  assembled_files TEXT[],
  assembled_content TEXT,
  assembled_at TIMESTAMPTZ DEFAULT now(),
  stale BOOLEAN DEFAULT false
);

ALTER TABLE nexus_context_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON nexus_context_packages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON nexus_context_packages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Wire context_package_id FK now that both tables exist
ALTER TABLE nexus_task_details
  ADD CONSTRAINT fk_nexus_task_details_context_package
  FOREIGN KEY (context_package_id) REFERENCES nexus_context_packages(id);

-- ============================================================================
-- TABLE: nexus_agent_sessions
-- Track who's working on what, active sessions.
-- ============================================================================
CREATE TABLE nexus_agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent TEXT NOT NULL,
  model TEXT,
  card_id UUID REFERENCES nexus_cards(id),
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'idle', 'completed')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_nexus_sessions_active ON nexus_agent_sessions(agent)
  WHERE status = 'active';

ALTER TABLE nexus_agent_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON nexus_agent_sessions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON nexus_agent_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE nexus_agent_sessions;

-- ============================================================================
-- TRIGGERS: Emit events on card state changes
-- ============================================================================
CREATE OR REPLACE FUNCTION nexus_emit_card_event()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.lane IS DISTINCT FROM NEW.lane THEN
    INSERT INTO nexus_events (event_type, card_id, actor, payload)
    VALUES ('card.moved', NEW.id,
      COALESCE(current_setting('app.actor', true), 'system'),
      jsonb_build_object(
        'from_lane', OLD.lane,
        'to_lane', NEW.lane,
        'card_id', NEW.card_id
      ));
  END IF;

  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO nexus_events (event_type, card_id, actor, payload)
    VALUES ('card.assigned', NEW.id,
      COALESCE(current_setting('app.actor', true), 'system'),
      jsonb_build_object(
        'from', OLD.assigned_to,
        'to', NEW.assigned_to
      ));
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nexus_card_changes
  BEFORE UPDATE ON nexus_cards
  FOR EACH ROW EXECUTE FUNCTION nexus_emit_card_event();

-- ============================================================================
-- TRIGGERS: Emit events on comment creation (especially pivots)
-- ============================================================================
CREATE OR REPLACE FUNCTION nexus_emit_comment_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO nexus_events (event_type, card_id, actor, payload)
  VALUES (
    CASE WHEN NEW.is_pivot THEN 'comment.pivot' ELSE 'comment.added' END,
    NEW.card_id, NEW.author,
    jsonb_build_object(
      'comment_id', NEW.id,
      'type', NEW.comment_type,
      'is_pivot', NEW.is_pivot
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nexus_comment_created
  AFTER INSERT ON nexus_comments
  FOR EACH ROW EXECUTE FUNCTION nexus_emit_comment_event();

-- ============================================================================
-- TRIGGERS: Emit events on lock changes
-- ============================================================================
CREATE OR REPLACE FUNCTION nexus_emit_lock_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO nexus_events (event_type, card_id, actor, payload)
  VALUES (
    CASE WHEN NEW.released_at IS NOT NULL THEN 'lock.released' ELSE 'lock.acquired' END,
    NEW.card_id, NEW.agent,
    jsonb_build_object(
      'lock_type', NEW.lock_type,
      'target', NEW.target
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nexus_lock_changes
  AFTER INSERT OR UPDATE ON nexus_locks
  FOR EACH ROW EXECUTE FUNCTION nexus_emit_lock_event();

-- ============================================================================
-- TRIGGERS: Auto-set completed_at when card moves to done/integrated
-- ============================================================================
CREATE OR REPLACE FUNCTION nexus_card_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lane IN ('done', 'integrated') AND OLD.lane NOT IN ('done', 'integrated') THEN
    NEW.completed_at = COALESCE(NEW.completed_at, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nexus_card_completion
  BEFORE UPDATE ON nexus_cards
  FOR EACH ROW EXECUTE FUNCTION nexus_card_completion();

-- ============================================================================
-- TRIGGERS: Auto-update updated_at on task_details changes
-- ============================================================================
CREATE OR REPLACE FUNCTION nexus_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nexus_task_details_updated
  BEFORE UPDATE ON nexus_task_details
  FOR EACH ROW EXECUTE FUNCTION nexus_update_timestamp();

CREATE TRIGGER nexus_projects_updated
  BEFORE UPDATE ON nexus_projects
  FOR EACH ROW EXECUTE FUNCTION nexus_update_timestamp();
