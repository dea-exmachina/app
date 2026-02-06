/**
 * NEXUS — Next-Gen Execution & Unified System Types
 *
 * Shared types for the NEXUS orchestration engine (DEA-042).
 * Used by cards, tasks, comments, locks, events, context, and agent sessions.
 */

// ── Card Types ──────────────────────────────────────────

export interface NexusProject {
  id: string
  slug: string
  name: string
  delegation_policy: DelegationPolicy
  override_reason: string | null
  protected_paths: string[] | null
  repo_url: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type DelegationPolicy = 'dea-only' | 'delegation-first'

export interface NexusCard {
  id: string
  card_id: string
  project_id: string | null
  parent_id: string | null
  board: string
  lane: CardLane
  title: string
  summary: string | null
  card_type: CardType
  delegation_tag: DelegationTag
  delegation_justification: string | null
  assigned_to: string | null
  assigned_model: string | null
  priority: CardPriority
  source: string | null
  tags: string[] | null
  completed_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type CardLane =
  | 'inbox' | 'handoff' | 'planning' | 'ready' | 'in_progress' | 'review' | 'done'
  | 'proposed' | 'queued' | 'executing' | 'delivered' | 'integrated'

export type CardType = 'epic' | 'task' | 'bug' | 'chore' | 'research' | 'phase'
export type DelegationTag = 'BENDER' | 'DEA'
export type CardPriority = 'critical' | 'high' | 'normal' | 'low'

export interface NexusCardCreate {
  card_id: string
  project_id?: string
  parent_id?: string
  board: string
  lane: CardLane
  title: string
  summary?: string
  card_type: CardType
  delegation_tag?: DelegationTag
  delegation_justification?: string
  assigned_to?: string
  assigned_model?: string
  priority?: CardPriority
  source?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface NexusCardUpdate {
  lane?: CardLane
  title?: string
  summary?: string
  delegation_tag?: DelegationTag
  delegation_justification?: string
  assigned_to?: string | null
  assigned_model?: string | null
  priority?: CardPriority
  tags?: string[]
  completed_at?: string | null
  metadata?: Record<string, unknown>
}

// ── Task Detail Types ───────────────────────────────────

export interface NexusTaskDetails {
  id: string
  card_id: string
  overview: string | null
  requirements: string | null
  acceptance_criteria: string | null
  constraints: string | null
  deliverables: string | null
  references: string | null
  branch: string
  declared_scope: string[] | null
  actual_scope: string[] | null
  context_package_id: string | null
  execution_notes: string | null
  review_decision: ReviewDecision | null
  review_notes: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
  updated_at: string
}

export type ReviewDecision = 'approved' | 'needs_refinement' | 'insufficient'

export interface NexusTaskDetailsCreate {
  card_id: string
  overview?: string
  requirements?: string
  acceptance_criteria?: string
  constraints?: string
  deliverables?: string
  references?: string
  branch?: string
  declared_scope?: string[]
}

export interface NexusTaskDetailsUpdate {
  overview?: string
  requirements?: string
  acceptance_criteria?: string
  constraints?: string
  deliverables?: string
  references?: string
  declared_scope?: string[]
  actual_scope?: string[]
  execution_notes?: string
  review_decision?: ReviewDecision
  review_notes?: string
  reviewed_at?: string
  reviewed_by?: string
}

// ── Comment Types ───────────────────────────────────────

export interface NexusComment {
  id: string
  card_id: string
  author: string
  content: string
  comment_type: CommentType
  is_pivot: boolean
  pivot_impact: PivotImpact | null
  resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

export type CommentType = 'note' | 'pivot' | 'question' | 'directive'
export type PivotImpact = 'minor' | 'major'

export interface NexusCommentCreate {
  card_id: string
  author: string
  content: string
  comment_type?: CommentType
  is_pivot?: boolean
  pivot_impact?: PivotImpact
}

// ── Lock Types ──────────────────────────────────────────

export interface NexusLock {
  id: string
  lock_type: LockType
  card_id: string | null
  agent: string
  target: string
  acquired_at: string
  expires_at: string | null
  released_at: string | null
  metadata: Record<string, unknown>
}

export type LockType = 'task' | 'file' | 'scope'

export interface NexusLockRequest {
  lock_type: LockType
  card_id?: string
  agent: string
  target: string
  expires_at?: string
  metadata?: Record<string, unknown>
}

export interface NexusLockConflict {
  conflicting_lock: NexusLock
  requested_target: string
  requested_by: string
}

// ── Event Types ─────────────────────────────────────────

export interface NexusEvent {
  id: string
  event_type: NexusEventType
  card_id: string | null
  actor: string
  payload: Record<string, unknown>
  created_at: string
}

export type NexusEventType =
  | 'card.created' | 'card.moved' | 'card.assigned' | 'card.completed'
  | 'comment.added' | 'comment.pivot'
  | 'lock.acquired' | 'lock.released'
  | 'scope.conflict'
  | 'context.stale'
  | 'session.started' | 'session.ended'

// ── Context Package Types ───────────────────────────────

export interface NexusContextPackage {
  id: string
  card_id: string
  layers: ContextLayers
  assembled_files: string[] | null
  assembled_content: string | null
  assembled_at: string
  stale: boolean
}

export interface ContextLayers {
  base?: string[]
  task_type?: string[]
  identity?: string[]
  project?: string[]
  learnings?: string[]
  comments?: string[]
}

// ── Agent Session Types ─────────────────────────────────

export interface NexusAgentSession {
  id: string
  agent: string
  model: string | null
  card_id: string | null
  status: SessionStatus
  started_at: string
  ended_at: string | null
  metadata: Record<string, unknown>
}

export type SessionStatus = 'active' | 'idle' | 'completed'

export interface NexusAgentSessionCreate {
  agent: string
  model?: string
  card_id?: string
  metadata?: Record<string, unknown>
}

// ── Query / Filter Types ────────────────────────────────

export interface CardFilters {
  board?: string
  lane?: CardLane | CardLane[]
  project_id?: string
  assigned_to?: string
  delegation_tag?: DelegationTag
  priority?: CardPriority
  card_type?: CardType
  parent_id?: string | null
  tags?: string[]
}

export interface EventFilters {
  card_id?: string
  event_type?: NexusEventType | NexusEventType[]
  actor?: string
  since?: string
  limit?: number
}
