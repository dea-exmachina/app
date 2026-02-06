-- QUEEN — External Orchestration Tables (DEA-032)
-- Migration: 005_queen_tables
-- Creates: queen_events, agent_health, webhook_configs, sync_state

-- queen_events: Core event store, all QUEEN events flow through here
CREATE TABLE queen_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  actor TEXT,
  summary TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  trace_id UUID,
  project TEXT,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_queen_events_type ON queen_events(type);
CREATE INDEX idx_queen_events_source ON queen_events(source);
CREATE INDEX idx_queen_events_project ON queen_events(project);
CREATE INDEX idx_queen_events_created ON queen_events(created_at DESC);
CREATE INDEX idx_queen_events_trace ON queen_events(trace_id) WHERE trace_id IS NOT NULL;

ALTER TABLE queen_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON queen_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Also allow service role (for API routes using service key)
CREATE POLICY "Allow all for service role" ON queen_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE queen_events;

-- agent_health: Presence tracking and stuck detection
CREATE TABLE agent_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  status TEXT DEFAULT 'unknown'
    CHECK (status IN ('active', 'idle', 'stuck', 'offline', 'unknown')),
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  current_task TEXT,
  metrics JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agent_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON agent_health
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON agent_health
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE agent_health;

-- webhook_configs: Registered webhook sources
CREATE TABLE webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL UNIQUE,
  endpoint_path TEXT NOT NULL,
  secret TEXT,
  enabled BOOLEAN DEFAULT true,
  transform_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON webhook_configs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON webhook_configs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- sync_state: Bidirectional sync tracking
CREATE TABLE sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  internal_type TEXT NOT NULL
    CHECK (internal_type IN ('kanban_card', 'bender_task', 'project')),
  internal_id TEXT NOT NULL,
  sync_direction TEXT DEFAULT 'inbound'
    CHECK (sync_direction IN ('inbound', 'outbound', 'bidirectional')),
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'stale', 'conflict', 'error')),
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(source, external_id)
);

CREATE INDEX idx_sync_state_source ON sync_state(source);
CREATE INDEX idx_sync_state_internal ON sync_state(internal_type, internal_id);

ALTER TABLE sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON sync_state
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON sync_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);
