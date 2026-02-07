-- Canvases table for Excalidraw whiteboard feature
-- Stores canvas metadata and Excalidraw scene JSON

CREATE TABLE IF NOT EXISTS canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Untitled',
  description TEXT,
  -- Excalidraw scene data: { elements, appState, files }
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Base64 thumbnail for list view (optional, can be generated client-side)
  thumbnail TEXT,
  -- Link to project (optional)
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for listing canvases by update time
CREATE INDEX idx_canvases_updated_at ON canvases(updated_at DESC);

-- Index for filtering by project
CREATE INDEX idx_canvases_project_id ON canvases(project_id) WHERE project_id IS NOT NULL;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_canvases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER canvases_updated_at
  BEFORE UPDATE ON canvases
  FOR EACH ROW
  EXECUTE FUNCTION update_canvases_updated_at();

-- Enable RLS
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations (service role bypasses RLS)
CREATE POLICY "Allow all for authenticated" ON canvases
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE canvases IS 'Excalidraw whiteboard canvases';
COMMENT ON COLUMN canvases.data IS 'Full Excalidraw scene: { elements: [], appState: {}, files: {} }';
