-- Secrets registry - catalog of env vars by infrastructure component
-- Types only, never actual values

CREATE TABLE IF NOT EXISTS architecture_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Component identification
  component_id TEXT NOT NULL,
  component_type TEXT NOT NULL
    CHECK (component_type IN ('infrastructure', 'meta', 'project')),

  -- Secret metadata
  variable_name TEXT NOT NULL,
  secret_type TEXT NOT NULL
    CHECK (secret_type IN ('API_KEY', 'TOKEN', 'URL', 'UID_PW', 'SECRET', 'OTHER')),
  description TEXT,
  required BOOLEAN DEFAULT true,

  -- Location classification
  location TEXT NOT NULL
    CHECK (location IN ('vault', 'webapp', 'both')),

  -- Status
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'deprecated', 'planned')),

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(component_id, variable_name)
);

-- Indexes
CREATE INDEX idx_arch_secrets_component ON architecture_secrets(component_id);
CREATE INDEX idx_arch_secrets_location ON architecture_secrets(location);
CREATE INDEX idx_arch_secrets_status ON architecture_secrets(status);

-- Row Level Security
ALTER TABLE architecture_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Secrets registry viewable by authenticated" ON architecture_secrets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Secrets registry writable by service role" ON architecture_secrets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed initial secrets (types only, no values)
INSERT INTO architecture_secrets (component_id, component_type, variable_name, secret_type, description, location) VALUES
  -- Supabase
  ('supabase', 'infrastructure', 'SUPABASE_URL', 'URL', 'Supabase project URL', 'webapp'),
  ('supabase', 'infrastructure', 'SUPABASE_SERVICE_KEY', 'API_KEY', 'Service role key for server operations', 'webapp'),
  ('supabase', 'infrastructure', 'SUPABASE_ANON_KEY', 'API_KEY', 'Anonymous public key for client', 'webapp'),
  ('supabase', 'infrastructure', 'NEXT_PUBLIC_SUPABASE_URL', 'URL', 'Public Supabase URL (client-side)', 'webapp'),
  ('supabase', 'infrastructure', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'API_KEY', 'Anonymous public key (client-side)', 'webapp'),

  -- GitHub
  ('github', 'infrastructure', 'GITHUB_TOKEN', 'TOKEN', 'Personal access token for GitHub API', 'webapp'),
  ('github', 'infrastructure', 'GITHUB_OWNER', 'OTHER', 'Repository owner name', 'webapp'),
  ('github', 'infrastructure', 'GITHUB_REPO', 'OTHER', 'Repository name', 'webapp'),

  -- Vercel
  ('vercel', 'infrastructure', 'VERCEL_TOKEN', 'TOKEN', 'Vercel deployment token', 'webapp'),

  -- Google OAuth (vault)
  ('google', 'infrastructure', 'GOOGLE_CLIENT_ID', 'API_KEY', 'OAuth client ID', 'vault'),
  ('google', 'infrastructure', 'GOOGLE_CLIENT_SECRET', 'SECRET', 'OAuth client secret', 'vault'),
  ('google', 'infrastructure', 'GOOGLE_REDIRECT_URI', 'URL', 'OAuth redirect URI', 'vault'),
  ('google', 'infrastructure', 'GOOGLE_SHEET_ID', 'OTHER', 'Target Google Sheet ID', 'vault'),

  -- Cloudflare R2 (vault)
  ('r2', 'infrastructure', 'R2_ENDPOINT', 'URL', 'Cloudflare R2 endpoint URL', 'vault'),
  ('r2', 'infrastructure', 'R2_KEY_ID', 'API_KEY', 'R2 access key ID', 'vault'),
  ('r2', 'infrastructure', 'R2_SECRET', 'SECRET', 'R2 secret access key', 'vault'),
  ('r2', 'infrastructure', 'R2_BUCKET', 'OTHER', 'R2 bucket name', 'vault'),

  -- Auth
  ('auth', 'infrastructure', 'ADMIN_USERNAME', 'OTHER', 'Admin login username', 'webapp'),
  ('auth', 'infrastructure', 'ADMIN_PASSWORD', 'UID_PW', 'Admin login password', 'webapp'),
  ('auth', 'infrastructure', 'AUTH_SECRET', 'SECRET', 'Session cookie encryption key', 'webapp'),

  -- Resend (vault)
  ('resend', 'infrastructure', 'RESEND_API_KEY', 'API_KEY', 'Resend email API key', 'vault')
ON CONFLICT (component_id, variable_name) DO NOTHING;
