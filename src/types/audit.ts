/**
 * Unified Audit Trail Types
 *
 * Schema: audit_log table (NEXUS-066)
 * Council review: 2026-02-16 (CONDITIONAL PASS)
 * Taxonomy: 65 event types across 13 categories
 */

// ── Core Types ──────────────────────────────────────────

export interface AuditLogEntry {
  id: string
  event_id: string            // '{category}.{action}' e.g. 'card.created'
  action: AuditAction
  category: AuditCategory
  actor: string               // 'dea', 'bender+atlas', 'system', 'trigger'
  actor_type: ActorType
  entity_type: string         // Table name: 'nexus_cards', 'nexus_comments', etc.
  entity_id: string | null    // Row UUID
  project_id: string | null
  card_id: string | null      // Denormalized display ID: 'NEXUS-066'
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  metadata: AuditMetadata
  source: AuditSource
  created_at: string
}

// ── Enums ───────────────────────────────────────────────

export type AuditCategory =
  | 'card'
  | 'comment'
  | 'sprint'
  | 'workstream'
  | 'team'
  | 'bender'
  | 'project'
  | 'migration'
  | 'trigger'
  | 'rls'
  | 'function'
  | 'setting'
  | 'system'

export type AuditAction =
  // Card actions (15)
  | 'created'
  | 'updated'
  | 'deleted'
  | 'lane_changed'
  | 'assigned'
  | 'priority_changed'
  | 'blocked'
  | 'unblocked'
  | 'sprint_changed'
  | 'workstream_changed'
  | 'parent_changed'
  | 'flagged_for_production'
  | 'delegation_bypassed'
  | 'locked'
  | 'unlocked'
  // Comment actions (4) — created, updated, deleted reused
  | 'resolved'
  // Sprint actions (5) — created, updated, deleted reused
  | 'activated'
  | 'completed'
  // Workstream actions (4) — created, updated, deleted, completed reused
  // Team actions (4) — created, updated, deleted reused
  | 'member_added'
  // Bender actions (6)
  | 'task_created'
  | 'task_updated'
  | 'dispatched'
  | 'delivered'
  | 'scored'
  // Project actions (4) — created, updated, deleted reused
  | 'archived'
  // Migration actions (3)
  | 'applied'
  | 'promoted'
  | 'rolled_back'
  // Trigger/RLS/Function actions (9) — created, dropped reused
  | 'replaced'
  | 'enabled'
  | 'policy_created'
  | 'policy_dropped'
  // System actions (8) — created reused
  | 'health_check'
  | 'release_created'
  | 'release_promoted'
  | 'session_started'
  | 'session_ended'
  | 'backup_created'
  | 'audit_initialized'
  | 'error'

export type ActorType = 'dea' | 'bender' | 'system' | 'user'

export type AuditSource = 'trigger' | 'api' | 'vault' | 'migration'

// ── Metadata ────────────────────────────────────────────

export interface AuditMetadata {
  trace_id?: string           // Correlation ID linking related events
  session_id?: string         // dea/bender session identifier
  source_detail?: string      // Additional source context
  bypass_justification?: string // Required when delegation_bypassed
  [key: string]: unknown      // Extensible
}

// ── Query/Filter Types ──────────────────────────────────

export interface AuditLogFilter {
  category?: AuditCategory
  action?: AuditAction
  entity_type?: string
  entity_id?: string
  card_id?: string
  project_id?: string
  actor?: string
  actor_type?: ActorType
  source?: AuditSource
  from?: string               // ISO timestamp
  to?: string                 // ISO timestamp
  limit?: number              // Default 50, max 1000
  offset?: number
}

export interface AuditLogPage {
  data: AuditLogEntry[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}

// ── Event ID Helpers ────────────────────────────────────

/** Build event_id from category + action */
export function buildEventId(category: AuditCategory, action: AuditAction): string {
  return `${category}.${action}`
}

/** Parse event_id into category + action */
export function parseEventId(eventId: string): { category: string; action: string } {
  const [category, ...rest] = eventId.split('.')
  return { category, action: rest.join('.') }
}
