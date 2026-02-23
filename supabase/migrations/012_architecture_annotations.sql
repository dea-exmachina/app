-- Architecture annotation system for nodes, variables, and workflows
-- Enables comments/suggestions/tasks on any architecture element

CREATE TABLE IF NOT EXISTS architecture_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Target identification
  target_type TEXT NOT NULL
    CHECK (target_type IN ('node', 'variable', 'connection', 'workflow', 'table')),
  target_id TEXT NOT NULL,
  target_tier TEXT
    CHECK (target_tier IN ('meta', 'project', 'infrastructure')),

  -- Annotation content
  annotation_type TEXT NOT NULL
    CHECK (annotation_type IN ('note', 'suggestion', 'task', 'todo', 'warning')),
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  priority TEXT DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'critical')),

  -- Resolution tracking
  resolved BOOLEAN DEFAULT false,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_arch_annotations_target ON architecture_annotations(target_type, target_id);
CREATE INDEX idx_arch_annotations_resolved ON architecture_annotations(resolved) WHERE NOT resolved;
CREATE INDEX idx_arch_annotations_type ON architecture_annotations(annotation_type);
CREATE INDEX idx_arch_annotations_priority ON architecture_annotations(priority) WHERE priority IN ('high', 'critical');

-- Row Level Security
ALTER TABLE architecture_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Annotations viewable by authenticated" ON architecture_annotations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Annotations writable by authenticated" ON architecture_annotations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Annotations updatable by authenticated" ON architecture_annotations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Annotations deletable by authenticated" ON architecture_annotations
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Annotations full access for service role" ON architecture_annotations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Enable Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE architecture_annotations;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_arch_annotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER arch_annotations_updated_at
  BEFORE UPDATE ON architecture_annotations
  FOR EACH ROW EXECUTE FUNCTION update_arch_annotations_updated_at();
