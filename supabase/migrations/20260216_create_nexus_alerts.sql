CREATE TABLE IF NOT EXISTS nexus_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('vercel', 'supabase', 'github', 'resend', 'cloudflare', 'hookify', 'manual')),
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('critical', 'warning', 'info')),
  title text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved')),
  card_id uuid REFERENCES nexus_cards(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

CREATE INDEX idx_nexus_alerts_status_created ON nexus_alerts (status, created_at DESC);
CREATE INDEX idx_nexus_alerts_severity ON nexus_alerts (severity);

ALTER TABLE nexus_alerts ENABLE ROW LEVEL SECURITY;
