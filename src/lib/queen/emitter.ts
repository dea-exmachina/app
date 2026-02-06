/**
 * QUEEN Event Emitter Service
 *
 * The canonical way to emit events into the QUEEN pipeline.
 * Handles validation, normalization, and database insertion.
 * All event emission should go through this module — not direct table inserts.
 *
 * TASK-008 | Phase 1 Core Infrastructure
 */

import { tables } from '@/lib/server/database'
import type { QueenEvent, QueenEventCreate } from '@/types/queen'
import { createEvent, generateTraceId, EVENT_TYPES } from './events'

// ── Error Types ────────────────────────────────────────────

export class EventEmitError extends Error {
  constructor(
    message: string,
    public readonly validationErrors?: Array<{ field: string; message: string }>,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'EventEmitError'
  }
}

// ── Core Emitter ───────────────────────────────────────────

/**
 * Emit a single event into the QUEEN pipeline.
 *
 * Flow: validate -> normalize -> insert -> return persisted event
 *
 * @throws EventEmitError on validation failure or database error
 */
export async function emitEvent(input: QueenEventCreate): Promise<QueenEvent> {
  // Validate and normalize
  const result = createEvent(input)
  if (!result.valid || !result.event) {
    throw new EventEmitError('Event validation failed', result.errors)
  }

  const event = result.event

  // Insert into database
  const { data, error } = await tables.queen_events
    .insert({
      type: event.type,
      source: event.source,
      actor: event.actor || null,
      summary: event.summary,
      payload: event.payload || {},
      trace_id: event.trace_id || null,
      project: event.project || null,
    })
    .select()
    .single()

  if (error) {
    throw new EventEmitError(`Database insert failed: ${error.message}`, undefined, error)
  }

  return data as QueenEvent
}

/**
 * Emit multiple events in a single batch.
 *
 * All events are validated before any are inserted.
 * Uses a single bulk insert for efficiency.
 * All events in a batch share a trace_id unless individually specified.
 *
 * @throws EventEmitError if any event fails validation (none are inserted)
 */
export async function emitBatch(inputs: QueenEventCreate[]): Promise<QueenEvent[]> {
  if (inputs.length === 0) return []

  // Shared trace_id for the batch (unless individual events override)
  const batchTraceId = generateTraceId()

  // Validate all events first — fail fast before any DB writes
  const validated: QueenEventCreate[] = []
  const allErrors: Array<{ index: number; errors: Array<{ field: string; message: string }> }> = []

  for (let i = 0; i < inputs.length; i++) {
    const result = createEvent({
      ...inputs[i],
      trace_id: inputs[i].trace_id || batchTraceId,
    })
    if (!result.valid || !result.event) {
      allErrors.push({ index: i, errors: result.errors })
    } else {
      validated.push(result.event)
    }
  }

  if (allErrors.length > 0) {
    const summary = allErrors
      .map((e) => `[${e.index}]: ${e.errors.map((err) => err.message).join(', ')}`)
      .join('; ')
    throw new EventEmitError(`Batch validation failed: ${summary}`)
  }

  // Bulk insert
  const rows = validated.map((event) => ({
    type: event.type,
    source: event.source,
    actor: event.actor || null,
    summary: event.summary,
    payload: event.payload || {},
    trace_id: event.trace_id || null,
    project: event.project || null,
  }))

  const { data, error } = await tables.queen_events.insert(rows).select()

  if (error) {
    throw new EventEmitError(`Batch insert failed: ${error.message}`, undefined, error)
  }

  return (data ?? []) as QueenEvent[]
}

// ── Typed Convenience Emitters ─────────────────────────────
// These provide type-safe wrappers for the most common event patterns.

type AgentEventType = keyof typeof EVENT_TYPES.agent
type TaskEventType = keyof typeof EVENT_TYPES.task
type GitEventType = keyof typeof EVENT_TYPES.git

/**
 * Emit an agent lifecycle event.
 *
 * @param type - Agent event subtype (online, idle, stuck, offline)
 * @param agent - Agent name (e.g., "claude_code", "antigravity")
 * @param details - Optional additional payload data
 */
export async function emitAgentEvent(
  type: AgentEventType,
  agent: string,
  details?: Record<string, unknown>
): Promise<QueenEvent> {
  return emitEvent({
    type: EVENT_TYPES.agent[type],
    source: 'system',
    actor: agent,
    summary: `Agent ${agent} is now ${type}`,
    payload: { agent, ...details },
  })
}

/**
 * Emit a task lifecycle event.
 *
 * @param type - Task event subtype (created, started, completed, blocked, reviewed)
 * @param taskId - Task identifier (e.g., "TASK-008", "DEA-032")
 * @param details - Optional additional payload data (actor, project, etc.)
 */
export async function emitTaskEvent(
  type: TaskEventType,
  taskId: string,
  details?: Record<string, unknown>
): Promise<QueenEvent> {
  return emitEvent({
    type: EVENT_TYPES.task[type],
    source: (details?.source as string) || 'system',
    actor: (details?.actor as string) || undefined,
    summary: `Task ${taskId} ${type}`,
    payload: { task_id: taskId, ...details },
    project: (details?.project as string) || undefined,
  })
}

/**
 * Emit a git lifecycle event.
 *
 * @param type - Git event subtype (commit, push, pr_created, pr_merged)
 * @param details - Payload with git-specific data (repo, branch, sha, etc.)
 */
export async function emitGitEvent(
  type: GitEventType,
  details: Record<string, unknown>
): Promise<QueenEvent> {
  const repo = (details.repo as string) || 'unknown'
  const branch = (details.branch as string) || ''
  const summaryParts = [`git.${type} on ${repo}`]
  if (branch) summaryParts.push(`(${branch})`)

  return emitEvent({
    type: EVENT_TYPES.git[type],
    source: (details.source as string) || 'system',
    actor: (details.actor as string) || undefined,
    summary: summaryParts.join(' '),
    payload: details,
    project: (details.project as string) || undefined,
  })
}
