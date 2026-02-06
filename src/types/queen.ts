/**
 * QUEEN — External Orchestration Types
 *
 * Shared types for the QUEEN subsystem (DEA-032).
 * Used by event pipeline, agent health, webhooks, and sync engine.
 */

// ── Event Types ──────────────────────────────────────────

export interface QueenEvent {
  id: string
  type: string
  source: string
  actor: string | null
  summary: string
  payload: Record<string, unknown>
  trace_id: string | null
  project: string | null
  processed: boolean
  created_at: string
}

export interface QueenEventCreate {
  type: string
  source: string
  actor?: string
  summary: string
  payload?: Record<string, unknown>
  trace_id?: string
  project?: string
}

// ── Agent Health Types ───────────────────────────────────

export interface AgentHealth {
  id: string
  agent_name: string
  platform: string
  status: AgentStatus
  last_activity_at: string
  current_task: string | null
  metrics: AgentMetrics
  updated_at: string
}

export type AgentStatus = 'active' | 'idle' | 'stuck' | 'offline' | 'unknown'

export interface AgentMetrics {
  token_usage?: number
  tool_calls?: number
  session_start?: string
  idle_seconds?: number
  stuck_threshold?: number // default 900
}

export interface AgentHealthUpdate {
  status?: AgentStatus
  current_task?: string | null
  metrics?: Partial<AgentMetrics>
}

// ── Webhook Types ────────────────────────────────────────

export interface WebhookConfig {
  id: string
  source: string
  endpoint_path: string
  secret: string | null
  enabled: boolean
  transform_config: TransformConfig
  created_at: string
  updated_at: string
}

export interface TransformConfig {
  title_field?: string
  description_field?: string
  status_map?: Record<string, string>
  tag_fields?: string[]
  priority_field?: string
}

// ── Sync Types ───────────────────────────────────────────

export interface SyncState {
  id: string
  source: string
  external_id: string
  internal_type: 'kanban_card' | 'bender_task' | 'project'
  internal_id: string
  sync_direction: 'inbound' | 'outbound' | 'bidirectional'
  status: 'active' | 'stale' | 'conflict' | 'error'
  last_synced_at: string
  metadata: Record<string, unknown>
}
