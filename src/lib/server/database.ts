/**
 * Supabase Database Client
 *
 * Provides typed database access for Control Center v2.
 * Uses secret key for server-side operations (bypasses RLS intentionally).
 * Auth-gated RLS on all tables ensures only authenticated users can access data
 * via the anon/user client. This client is for server-only admin operations.
 *
 * Lazy initialization: client is created on first use, not at module load.
 * This prevents module-scope crashes from killing Vercel's bundled functions.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

let _db: SupabaseClient<Database> | null = null

/**
 * Get the Supabase client (lazy-initialized on first call)
 */
export function getDb(): SupabaseClient<Database> {
  if (!_db) {
    if (!process.env.SUPABASE_URL) {
      throw new Error('Missing environment variable: SUPABASE_URL')
    }
    if (!process.env.SUPABASE_SECRET_KEY) {
      throw new Error('Missing environment variable: SUPABASE_SECRET_KEY')
    }
    _db = createClient<Database>(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }
  return _db
}

/**
 * Backward-compatible db export (proxies to lazy-initialized client)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: SupabaseClient<Database> = new Proxy({} as any, {
  get(_, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getDb() as any)[prop]
  },
})

/**
 * Type-safe table accessor (lazy via getters — each access calls db.from())
 * Usage: const { data } = await tables.projects.select('*')
 */
export const tables = {
  get projects() { return db.from('projects') },
  get project_templates() { return db.from('project_templates') },
  get bender_identities() { return db.from('bender_identities') },
  get project_benders() { return db.from('project_benders') },
  get bender_platforms() { return db.from('bender_platforms') },
  get bender_teams() { return db.from('bender_teams') },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get bender_team_members() { return (db as any).from('bender_team_members') as ReturnType<typeof db.from> },
  get bender_tasks() { return db.from('bender_tasks') },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get workflows() { return (db as any).from('workflows') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get messages() { return (db as any).from('messages') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get skills() { return (db as any).from('skills') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get inbox_items() { return (db as any).from('inbox_items') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get queen_events() { return (db as any).from('queen_events') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get agent_health() { return (db as any).from('agent_health') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get webhook_configs() { return (db as any).from('webhook_configs') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get sync_state() { return (db as any).from('sync_state') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get nexus_projects() { return (db as any).from('nexus_projects') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get nexus_cards() { return (db as any).from('nexus_cards') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get nexus_task_details() { return (db as any).from('nexus_task_details') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get nexus_comments() { return (db as any).from('nexus_comments') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get nexus_locks() { return (db as any).from('nexus_locks') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get nexus_events() { return (db as any).from('nexus_events') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get nexus_context_packages() { return (db as any).from('nexus_context_packages') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get nexus_agent_sessions() { return (db as any).from('nexus_agent_sessions') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get architecture_annotations() { return (db as any).from('architecture_annotations') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get architecture_secrets() { return (db as any).from('architecture_secrets') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get canvases() { return (db as any).from('canvases') as ReturnType<typeof db.from> },
  get routing_config() { return db.from('routing_config') },
  get model_library() { return db.from('model_library') },
  get task_type_routing() { return db.from('task_type_routing') },
  get supervisor_lenses() { return db.from('supervisor_lenses') },
  get identity_project_context() { return db.from('identity_project_context') },
  get identity_recommendations() { return db.from('identity_recommendations') },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get audit_log() { return (db as any).from('audit_log') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get bender_performance() { return (db as any).from('bender_performance') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get project_tech_stack() { return (db as any).from('project_tech_stack') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get project_workflows() { return (db as any).from('project_workflows') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get user_settings() { return (db as any).from('user_settings') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get nexus_alerts() { return (db as any).from('nexus_alerts') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get nexus_card_reopens() { return (db as any).from('nexus_card_reopens') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get nexus_token_usage() { return (db as any).from('nexus_token_usage') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get research_subscriptions() { return (db as any).from('research_subscriptions') as ReturnType<typeof db.from> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get research_reports() { return (db as any).from('research_reports') as ReturnType<typeof db.from> },
  get nexus_sprints() { return db.from('nexus_sprints') },
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
