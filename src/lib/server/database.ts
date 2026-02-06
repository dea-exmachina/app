/**
 * Supabase Database Client
 *
 * Provides typed database access for Control Center v2.
 * Uses service role key for server-side operations.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

if (!process.env.SUPABASE_URL) {
  throw new Error('Missing environment variable: SUPABASE_URL')
}

if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing environment variable: SUPABASE_SERVICE_KEY')
}

/**
 * Server-side Supabase client with service role privileges
 * Use this for API routes and server components
 */
export const db = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

/**
 * Type-safe table accessor
 * Usage: const { data } = await tables.projects.select('*')
 */
export const tables = {
  projects: db.from('projects'),
  project_templates: db.from('project_templates'),
  bender_identities: db.from('bender_identities'),
  project_benders: db.from('project_benders'),
  bender_platforms: db.from('bender_platforms'),
  bender_teams: db.from('bender_teams'),
  bender_tasks: db.from('bender_tasks'),
  kanban_boards: db.from('kanban_boards'),
  kanban_cards: db.from('kanban_cards'),
  workflows: db.from('workflows'),
  user_learnings: db.from('user_learnings'),
  messages: db.from('messages'),
  // QUEEN — External Orchestration (DEA-032)
  // Note: These tables are not yet in the generated supabase.ts types.
  // After running migration 005 and regenerating types, remove the casts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queen_events: (db as any).from('queen_events') as ReturnType<typeof db.from>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agent_health: (db as any).from('agent_health') as ReturnType<typeof db.from>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webhook_configs: (db as any).from('webhook_configs') as ReturnType<typeof db.from>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sync_state: (db as any).from('sync_state') as ReturnType<typeof db.from>,
}

/**
 * Helper: Generate slug from name
 * Converts "Client Project A" → "client-project-a"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Helper: Validate slug format
 * Must match: ^[a-z0-9-]+$
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug)
}
