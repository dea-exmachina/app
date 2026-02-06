/**
 * QUEEN Event Normalization & Validation Utilities
 *
 * Canonical definitions for event types, sources, and validation.
 * All event creation should flow through these utilities to ensure
 * consistency across the pipeline.
 *
 * TASK-008 | Phase 1 Core Infrastructure
 */

import type { QueenEventCreate } from '@/types/queen'

// ── Event Type Taxonomy ────────────────────────────────────
// Dot-notation hierarchy. Prefix match enables filtering by category.

export const EVENT_TYPES = {
  agent: {
    online: 'agent.online',
    idle: 'agent.idle',
    stuck: 'agent.stuck',
    offline: 'agent.offline',
  },
  task: {
    created: 'task.created',
    started: 'task.started',
    completed: 'task.completed',
    blocked: 'task.blocked',
    reviewed: 'task.reviewed',
  },
  file: {
    created: 'file.created',
    edited: 'file.edited',
    deleted: 'file.deleted',
  },
  git: {
    commit: 'git.commit',
    push: 'git.push',
    pr_created: 'git.pr_created',
    pr_merged: 'git.pr_merged',
  },
  message: {
    sent: 'message.sent',
    received: 'message.received',
  },
  webhook: {
    received: 'webhook.received',
    processed: 'webhook.processed',
    failed: 'webhook.failed',
  },
  sync: {
    inbound: 'sync.inbound',
    outbound: 'sync.outbound',
    conflict: 'sync.conflict',
    error: 'sync.error',
  },
  pipeline: {
    dlq: 'pipeline.dlq',
    processed: 'pipeline.processed',
  },
} as const

/** Flat set of all valid event type strings for O(1) lookup */
const VALID_EVENT_TYPES: Set<string> = new Set(
  Object.values(EVENT_TYPES).flatMap((category) => Object.values(category))
)

/** All valid event type category prefixes (e.g., "agent", "task") */
const VALID_PREFIXES: Set<string> = new Set(Object.keys(EVENT_TYPES))

// ── Source Validation ──────────────────────────────────────

export const VALID_SOURCES = [
  'claude_code',
  'antigravity',
  'dea',
  'user',
  'system',
  'webhook.jira',
  'webhook.linear',
  'webhook.gcal',
] as const

export type ValidSource = (typeof VALID_SOURCES)[number]

const VALID_SOURCES_SET: Set<string> = new Set(VALID_SOURCES)

// ── Validation Functions ───────────────────────────────────

/**
 * Validates an event type against the taxonomy.
 * Accepts both exact types ("agent.online") and category prefixes ("agent").
 */
export function validateEventType(type: string): boolean {
  if (VALID_EVENT_TYPES.has(type)) return true
  // Also accept bare category prefix (for wildcard filters)
  const prefix = type.split('.')[0]
  return VALID_PREFIXES.has(prefix)
}

/**
 * Validates a source string against known sources.
 */
export function validateSource(source: string): boolean {
  return VALID_SOURCES_SET.has(source)
}

// ── Trace ID Generation ────────────────────────────────────

/**
 * Generates a UUID v4 trace ID for correlating related events.
 * Uses crypto.randomUUID() which is available in Node 19+ and all modern browsers.
 */
export function generateTraceId(): string {
  return crypto.randomUUID()
}

// ── Event Creation ─────────────────────────────────────────

export interface EventValidationError {
  field: string
  message: string
}

export interface EventValidationResult {
  valid: boolean
  errors: EventValidationError[]
  /** The normalized event (only set when valid=true) */
  event?: QueenEventCreate
}

/**
 * Validates and normalizes a raw event input into a QueenEventCreate.
 *
 * Normalization:
 * - Trims string fields
 * - Defaults payload to {}
 * - Generates trace_id if not provided
 *
 * Validation:
 * - type must match taxonomy
 * - source must be a known source
 * - summary must be non-empty
 */
export function createEvent(input: QueenEventCreate): EventValidationResult {
  const errors: EventValidationError[] = []

  const type = input.type?.trim()
  const source = input.source?.trim()
  const summary = input.summary?.trim()

  if (!type) {
    errors.push({ field: 'type', message: 'Event type is required' })
  } else if (!validateEventType(type)) {
    errors.push({
      field: 'type',
      message: `Unknown event type "${type}". Must match taxonomy (e.g., agent.online, task.created).`,
    })
  }

  if (!source) {
    errors.push({ field: 'source', message: 'Event source is required' })
  } else if (!validateSource(source)) {
    errors.push({
      field: 'source',
      message: `Unknown source "${source}". Valid: ${VALID_SOURCES.join(', ')}`,
    })
  }

  if (!summary) {
    errors.push({ field: 'summary', message: 'Event summary is required' })
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  const event: QueenEventCreate = {
    type,
    source,
    summary,
    actor: input.actor?.trim() || undefined,
    payload: input.payload ?? {},
    trace_id: input.trace_id || generateTraceId(),
    project: input.project?.trim() || undefined,
  }

  return { valid: true, errors: [], event }
}
