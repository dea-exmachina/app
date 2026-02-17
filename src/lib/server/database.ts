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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bender_team_members: (db as any).from('bender_team_members') as ReturnType<typeof db.from>,
  bender_tasks: db.from('bender_tasks'),
  kanban_boards: db.from('kanban_boards'),
  kanban_cards: db.from('kanban_cards'),
  workflows: db.from('workflows'),
  user_learnings: db.from('user_learnings'),
  messages: db.from('messages'),
  // Skills — migrated from GitHub markdown (v1→v2)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  skills: (db as any).from('skills') as ReturnType<typeof db.from>,
  // Inbox — migrated from GitHub files (v1→v2)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inbox_items: (db as any).from('inbox_items') as ReturnType<typeof db.from>,
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
  // NEXUS — Next-Gen Execution & Unified System (DEA-042)
  // Note: These tables are not yet in the generated supabase.ts types.
  // After running migration 011 and regenerating types, remove the casts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nexus_projects: (db as any).from('nexus_projects') as ReturnType<typeof db.from>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nexus_cards: (db as any).from('nexus_cards') as ReturnType<typeof db.from>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nexus_task_details: (db as any).from('nexus_task_details') as ReturnType<typeof db.from>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nexus_comments: (db as any).from('nexus_comments') as ReturnType<typeof db.from>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nexus_locks: (db as any).from('nexus_locks') as ReturnType<typeof db.from>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nexus_events: (db as any).from('nexus_events') as ReturnType<typeof db.from>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nexus_context_packages: (db as any).from('nexus_context_packages') as ReturnType<typeof db.from>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nexus_agent_sessions: (db as any).from('nexus_agent_sessions') as ReturnType<typeof db.from>,
  // Architecture Visualization (DEA-043)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  architecture_annotations: (db as any).from('architecture_annotations') as ReturnType<typeof db.from>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  architecture_secrets: (db as any).from('architecture_secrets') as ReturnType<typeof db.from>,
  // Canvas / Whiteboard (Excalidraw)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canvases: (db as any).from('canvases') as ReturnType<typeof db.from>,
  // DEA-077 Model Routing & Team Architecture
  routing_config: db.from('routing_config'),
  model_library: db.from('model_library'),
  task_type_routing: db.from('task_type_routing'),
  supervisor_lenses: db.from('supervisor_lenses'),
  identity_project_context: db.from('identity_project_context'),
  identity_recommendations: db.from('identity_recommendations'),
  // Unified Audit Trail (NEXUS-066)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  audit_log: (db as any).from('audit_log') as ReturnType<typeof db.from>,
  // Tech Stack & Workflows (NEXUS-058)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project_tech_stack: (db as any).from('project_tech_stack') as ReturnType<typeof db.from>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project_workflows: (db as any).from('project_workflows') as ReturnType<typeof db.from>,
  // User Settings (NEXUS-057)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user_settings: (db as any).from('user_settings') as ReturnType<typeof db.from>,
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
