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

// ── Entity Transformation Types (TASK-010) ──────────────

/**
 * Canonical internal entity — the universal format all external entities
 * map to. This becomes the bridge between any external system and internal
 * kanban cards / bender tasks / projects.
 *
 * Design:
 * - Every field is optional except `external_id` and `source` — partial
 *   extraction is always valid (extract what you can, flag what's missing)
 * - `_meta` carries transformation diagnostics (warnings, extraction timestamp)
 * - New fields can be added without breaking existing connectors (additive only)
 */
export interface InternalEntity {
  /** External system's unique identifier (e.g., Jira issue key "PROJ-123") */
  external_id: string
  /** Source system identifier (e.g., "jira", "linear", "gcal") */
  source: string
  /** Human-readable title */
  title?: string
  /** Full description / body text */
  description?: string
  /** Mapped internal status (e.g., "proposed", "executing", "integrated") */
  status?: string
  /** Raw external status before mapping (preserved for debugging) */
  raw_status?: string
  /** Priority level (normalized to: "critical", "high", "medium", "low", "none") */
  priority?: InternalPriority
  /** Raw external priority before normalization */
  raw_priority?: string
  /** Tags / labels collected from the external entity */
  tags?: string[]
  /** Assignee name or identifier */
  assignee?: string
  /** Reporter / creator name or identifier */
  reporter?: string
  /** Project or workspace identifier in the external system */
  project?: string
  /** External URL to view the entity in its source system */
  url?: string
  /** When the external entity was created (ISO 8601) */
  external_created_at?: string
  /** When the external entity was last updated (ISO 8601) */
  external_updated_at?: string
  /** Target internal type for sync_state tracking */
  internal_type?: 'kanban_card' | 'bender_task' | 'project'
  /** Transformation metadata — diagnostics, not business data */
  _meta: TransformMeta
}

export type InternalPriority = 'critical' | 'high' | 'medium' | 'low' | 'none'

/**
 * Metadata attached to every transformation result.
 * Enables observability without polluting business fields.
 */
export interface TransformMeta {
  /** Which connector produced this entity */
  connector: string
  /** ISO 8601 timestamp of when the transformation ran */
  transformed_at: string
  /** Fields that were expected but missing or had wrong types */
  warnings: string[]
  /** Whether the extraction was complete (no warnings) or partial */
  partial: boolean
}

/**
 * Configuration for a specific connector instance.
 * Extends TransformConfig with connector-specific settings.
 */
export interface ConnectorConfig {
  /** Connector identifier (e.g., "jira", "linear", "gcal") */
  connector: string
  /** Whether this connector is active */
  enabled: boolean
  /** Base transform config (field mappings from webhook_configs) */
  transform: TransformConfig
  /** Connector-specific settings (e.g., Jira cloud vs server, Linear workspace) */
  settings?: Record<string, unknown>
}

/**
 * Result of a connector's extraction step.
 * Captures both the extracted entity and any issues encountered.
 */
export interface ExtractionResult {
  /** Whether extraction succeeded (at least external_id was found) */
  success: boolean
  /** The extracted entity (may be partial) */
  entity?: InternalEntity
  /** Errors that prevented extraction entirely */
  errors: string[]
}

/**
 * Result of the full transformation pipeline.
 * Wraps ExtractionResult with pipeline-level metadata.
 */
export interface TransformResult {
  /** Whether the full pipeline succeeded */
  success: boolean
  /** The final internal entity */
  entity?: InternalEntity
  /** Pipeline-level errors */
  errors: string[]
  /** Source webhook event ID for traceability */
  source_event_id?: string
}
