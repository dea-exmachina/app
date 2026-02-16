/**
 * CREEP Event Consumer Pattern
 *
 * Provides a registry for event consumers and a processing loop
 * that routes unprocessed events to matching consumers.
 *
 * Design decisions:
 * - Pull-based (poll for unprocessed events) not push-based
 *   v2: Supabase Realtime subscriptions for push
 * - In-memory consumer registry (consumers register at app startup)
 *   v2: Persistent consumer config in database
 * - Sequential processing with retry
 *   v2: Parallel processing with worker pools
 * - DLQ via pipeline.dlq events in queen_events table
 *   v2: Dedicated DLQ table with replay controls
 *
 * TASK-008 | Phase 1 Core Infrastructure
 */

import { tables } from '@/lib/server/database'
import type { CreepEvent } from '@/types/creep'
import { EVENT_TYPES } from './events'
import { emitEvent } from './emitter'

// ── Consumer Types ─────────────────────────────────────────

export interface EventConsumerFilter {
  /** Match event type prefix (e.g., "agent" matches "agent.online", "agent.stuck") */
  type?: string
  /** Match exact source */
  source?: string
  /** Match exact project */
  project?: string
}

export interface EventConsumerOptions {
  /** Number of retries before sending to DLQ. Default: 2 */
  retries?: number
  /**
   * Function to derive an idempotency key from an event.
   * If a consumer has already processed an event with this key, it's skipped.
   * v2: Tracked in a dedicated idempotency table. v1: noop (documented pattern only).
   */
  idempotencyKey?: (event: CreepEvent) => string
}

export interface EventConsumer {
  /** Unique consumer name for logging and debugging */
  name: string
  /** Filter to match events this consumer handles */
  filter: EventConsumerFilter
  /** Handler function — receives matched events one at a time */
  handler: (event: CreepEvent) => Promise<void>
  /** Processing options */
  options?: EventConsumerOptions
}

// ── Consumer Registry ──────────────────────────────────────
// In-memory registry. Consumers register at app startup.
// v2: Consider persistent registration for consumer discovery.

const consumerRegistry: EventConsumer[] = []

/**
 * Register an event consumer.
 * Consumers are matched against events using their filter criteria.
 * Multiple consumers can match the same event.
 */
export function registerConsumer(consumer: EventConsumer): void {
  // Guard against duplicate registration (by name)
  const existing = consumerRegistry.findIndex((c) => c.name === consumer.name)
  if (existing !== -1) {
    consumerRegistry[existing] = consumer
    return
  }
  consumerRegistry.push(consumer)
}

/**
 * Remove a consumer by name. Returns true if removed, false if not found.
 */
export function unregisterConsumer(name: string): boolean {
  const index = consumerRegistry.findIndex((c) => c.name === name)
  if (index === -1) return false
  consumerRegistry.splice(index, 1)
  return true
}

/**
 * Get all registered consumers. Primarily for debugging/introspection.
 */
export function getRegisteredConsumers(): ReadonlyArray<EventConsumer> {
  return consumerRegistry
}

/**
 * Get consumers that match a given event type.
 * Matching logic:
 * - No type filter = matches all types
 * - Type filter uses prefix matching ("agent" matches "agent.online")
 */
export function getConsumers(eventType: string): EventConsumer[] {
  return consumerRegistry.filter((consumer) => {
    if (!consumer.filter.type) return true
    return eventType.startsWith(consumer.filter.type)
  })
}

/**
 * Check if an event matches a consumer's full filter criteria.
 */
function matchesFilter(event: CreepEvent, filter: EventConsumerFilter): boolean {
  if (filter.type && !event.type.startsWith(filter.type)) return false
  if (filter.source && event.source !== filter.source) return false
  if (filter.project && event.project !== filter.project) return false
  return true
}

// ── Event Processing ───────────────────────────────────────

export interface ProcessResult {
  /** Number of events successfully processed */
  processed: number
  /** Number of events that failed all retries and went to DLQ */
  failed: number
  /** Number of events skipped (no matching consumers) */
  skipped: number
  /** Individual event results for observability */
  details: Array<{
    eventId: string
    eventType: string
    status: 'processed' | 'failed' | 'skipped'
    consumers?: string[]
    error?: string
  }>
}

/**
 * Process unprocessed events from the queue.
 *
 * Flow for each event:
 * 1. Fetch unprocessed events (oldest first, limited)
 * 2. For each event, find matching consumers
 * 3. Run each consumer's handler
 * 4. On success: mark event as processed
 * 5. On failure (after retries): emit pipeline.dlq event, mark original as processed
 *
 * Events with no matching consumers are marked processed immediately
 * (nothing to do — they're logged but don't block the pipeline).
 *
 * @param limit - Maximum events to process in this batch. Default: 50
 */
export async function processEvents(limit: number = 50): Promise<ProcessResult> {
  const result: ProcessResult = {
    processed: 0,
    failed: 0,
    skipped: 0,
    details: [],
  }

  // Fetch unprocessed events, oldest first
  // Exclude pipeline.dlq events to prevent infinite loops
  const { data: events, error: fetchError } = await tables.queen_events
    .select('*')
    .eq('processed', false)
    .not('type', 'eq', EVENT_TYPES.pipeline.dlq)
    .order('created_at', { ascending: true })
    .limit(Math.min(limit, 200))

  if (fetchError) {
    throw new Error(`Failed to fetch unprocessed events: ${fetchError.message}`)
  }

  if (!events || events.length === 0) {
    return result
  }

  for (const rawEvent of events) {
    const event = rawEvent as CreepEvent

    // Find matching consumers
    const matchingConsumers = consumerRegistry.filter((c) =>
      matchesFilter(event, c.filter)
    )

    if (matchingConsumers.length === 0) {
      // No consumers — mark as processed, log as skipped
      await markProcessed(event.id)
      result.skipped++
      result.details.push({
        eventId: event.id,
        eventType: event.type,
        status: 'skipped',
      })
      continue
    }

    // Run all matching consumers
    let allSucceeded = true
    const succeededConsumers: string[] = []
    let lastError: string | undefined

    for (const consumer of matchingConsumers) {
      const maxRetries = consumer.options?.retries ?? 2
      let succeeded = false

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          await consumer.handler(event)
          succeeded = true
          succeededConsumers.push(consumer.name)
          break
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err)
          // Log retry attempts
          if (attempt < maxRetries) {
            console.warn(
              `[CREEP] Consumer "${consumer.name}" failed on event ${event.id} (attempt ${attempt + 1}/${maxRetries + 1}): ${lastError}`
            )
          }
        }
      }

      if (!succeeded) {
        allSucceeded = false
        console.error(
          `[CREEP] Consumer "${consumer.name}" exhausted retries for event ${event.id}: ${lastError}`
        )

        // Send to DLQ
        await sendToDLQ(event, consumer.name, lastError || 'Unknown error')
      }
    }

    // Mark original event as processed regardless of consumer outcome.
    // Failed deliveries are tracked in DLQ events — we don't want the original
    // event blocking the pipeline on every future processing run.
    await markProcessed(event.id)

    if (allSucceeded) {
      result.processed++
      result.details.push({
        eventId: event.id,
        eventType: event.type,
        status: 'processed',
        consumers: succeededConsumers,
      })
    } else {
      result.failed++
      result.details.push({
        eventId: event.id,
        eventType: event.type,
        status: 'failed',
        consumers: succeededConsumers,
        error: lastError,
      })
    }
  }

  return result
}

// ── Internal Helpers ───────────────────────────────────────

/**
 * Mark an event as processed in the database.
 */
async function markProcessed(eventId: string): Promise<void> {
  const { error } = await tables.queen_events
    .update({ processed: true })
    .eq('id', eventId)

  if (error) {
    console.error(`[CREEP] Failed to mark event ${eventId} as processed: ${error.message}`)
  }
}

/**
 * Send a failed event to the Dead Letter Queue.
 *
 * DLQ entries are themselves events (type: pipeline.dlq) stored in queen_events.
 * This keeps the system simple — one table, one query pattern, one set of indexes.
 *
 * The DLQ event payload contains the original event ID and error details,
 * enabling replay by fetching the original and re-emitting it.
 */
async function sendToDLQ(
  originalEvent: CreepEvent,
  consumerName: string,
  errorMessage: string
): Promise<void> {
  try {
    await emitEvent({
      type: EVENT_TYPES.pipeline.dlq,
      source: 'system',
      actor: consumerName,
      summary: `DLQ: ${consumerName} failed on ${originalEvent.type} — ${errorMessage}`,
      payload: {
        original_event_id: originalEvent.id,
        original_event_type: originalEvent.type,
        original_event_source: originalEvent.source,
        consumer_name: consumerName,
        error: errorMessage,
        failed_at: new Date().toISOString(),
      },
      trace_id: originalEvent.trace_id || undefined,
      project: originalEvent.project || undefined,
    })
  } catch (dlqError) {
    // If even the DLQ fails, log it. We never throw from DLQ — it must not
    // cascade failures back to the processing loop.
    console.error(
      `[CREEP] CRITICAL: Failed to emit DLQ event for ${originalEvent.id}:`,
      dlqError
    )
  }
}

// ── Replay Utility ─────────────────────────────────────────

/**
 * Replay a dead-lettered event by fetching the original and re-emitting it.
 *
 * @param dlqEventId - The ID of the pipeline.dlq event (not the original event)
 * @returns The re-emitted event, or null if the original couldn't be found
 */
export async function replayDLQEvent(dlqEventId: string): Promise<CreepEvent | null> {
  // Fetch the DLQ event to get the original event ID
  const { data: dlqEvent, error: dlqError } = await tables.queen_events
    .select('*')
    .eq('id', dlqEventId)
    .eq('type', EVENT_TYPES.pipeline.dlq)
    .single()

  if (dlqError || !dlqEvent) {
    console.error(`[CREEP] DLQ event ${dlqEventId} not found`)
    return null
  }

  const originalId = (dlqEvent as CreepEvent).payload?.original_event_id as string
  if (!originalId) {
    console.error(`[CREEP] DLQ event ${dlqEventId} missing original_event_id in payload`)
    return null
  }

  // Fetch original event
  const { data: original, error: origError } = await tables.queen_events
    .select('*')
    .eq('id', originalId)
    .single()

  if (origError || !original) {
    console.error(`[CREEP] Original event ${originalId} not found for replay`)
    return null
  }

  const origEvent = original as CreepEvent

  // Re-emit with processed=false so it gets picked up again
  const { data: replayed, error: replayError } = await tables.queen_events
    .insert({
      type: origEvent.type,
      source: origEvent.source,
      actor: origEvent.actor,
      summary: `[REPLAY] ${origEvent.summary}`,
      payload: {
        ...origEvent.payload,
        _replayed_from: origEvent.id,
        _replayed_at: new Date().toISOString(),
      },
      trace_id: origEvent.trace_id,
      project: origEvent.project,
      processed: false,
    })
    .select()
    .single()

  if (replayError) {
    console.error(`[CREEP] Failed to replay event ${originalId}: ${replayError.message}`)
    return null
  }

  return replayed as CreepEvent
}
