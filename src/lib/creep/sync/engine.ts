/**
 * Core Sync Engine — Bidirectional synchronization between internal and external systems
 *
 * Three primary operations:
 * 1. processInboundEvent() — External system changed -> update internal state
 * 2. processOutboundChange() — Internal state changed -> push to external system
 * 3. reconcile() — Compare both sides and detect conflicts
 *
 * Flow diagram:
 *
 *   INBOUND (webhook -> internal):
 *   webhook.received -> transform pipeline -> upsert sync_state -> emit sync.inbound
 *
 *   OUTBOUND (internal -> external):
 *   internal change detected -> lookup sync_state -> circuit breaker check
 *     -> push to external via connector -> update sync_state -> emit sync.outbound
 *
 * All operations are idempotent. Processing the same event twice produces
 * the same result. This is achieved through:
 * - sync_state upsert on UNIQUE(source, external_id)
 * - Timestamp comparison for conflict detection
 * - Circuit breaker preventing duplicate push-back during failures
 *
 * TASK-011 | Phase 2 Bidirectional Sync Engine
 */

import type {
  CreepEvent,
  InternalEntity,
  TransformConfig,
  InboundSyncResult,
  OutboundSyncResult,
  SyncResult,
  SyncState,
} from '@/types/creep'
import { transformWebhookEvent } from '../transform'
import { getWebhookConfig } from '../webhooks'
import { emitEvent } from '../emitter'
import { EVENT_TYPES } from '../events'
import { generateTraceId } from '../events'
import {
  getSyncStateByExternalId,
  getSyncStatesByInternalId,
  upsertSyncState,
  markConflict,
  markError,
  updateSyncState,
  listSyncStates,
} from './state'
import {
  isSourceAllowed,
  recordSuccess,
  recordFailure,
  getBreakerStatus,
} from './circuit-breaker'

// ── Inbound Sync ─────────────────────────────────────────────

/**
 * Process an inbound event from an external system.
 *
 * This is the primary inbound sync entry point. Called when a webhook.received
 * event is detected (either by a consumer or manually).
 *
 * Pipeline:
 * 1. Extract source and raw payload from the event
 * 2. Check circuit breaker — if source is degraded, skip with error
 * 3. Look up transform config from webhook_configs
 * 4. Run transformation pipeline (TASK-010) to produce InternalEntity
 * 5. Check for conflict (both sides changed since last sync)
 * 6. Upsert sync_state record linking external_id -> internal entity
 * 7. Emit sync.inbound event
 *
 * Idempotency: Upserting on UNIQUE(source, external_id) means processing
 * the same webhook twice updates the same row rather than creating a duplicate.
 *
 * @param event - A CreepEvent of type webhook.received (or similar)
 * @returns InboundSyncResult with the sync state and entity
 */
export async function processInboundEvent(event: CreepEvent): Promise<InboundSyncResult> {
  const payload = event.payload
  const errors: string[] = []

  // ── Extract source ──
  const source = (payload.webhook_source as string) || event.source.replace('webhook.', '')
  if (!source) {
    return {
      success: false,
      errors: ['Cannot determine source from event payload or event.source'],
      conflict: false,
    }
  }

  // ── Circuit breaker check ──
  if (!isSourceAllowed(source)) {
    const status = getBreakerStatus(source)
    return {
      success: false,
      errors: [
        `Circuit breaker open for source "${source}". ` +
        `State: ${status?.state ?? 'unknown'}, ` +
        `failures: ${status?.failure_count ?? 0}/${status?.failure_threshold ?? '?'}. ` +
        `Retry after cooldown.`,
      ],
      conflict: false,
    }
  }

  // ── Look up transform config ──
  const webhookConfig = await getWebhookConfig(source)
  const transformConfig: TransformConfig = webhookConfig?.transform_config ?? {}

  // ── Run transformation pipeline ──
  const transformResult = transformWebhookEvent(payload, transformConfig)

  if (!transformResult.success || !transformResult.entity) {
    recordFailure(source)
    return {
      success: false,
      errors: transformResult.errors.length > 0
        ? transformResult.errors
        : ['Transformation produced no entity'],
      conflict: false,
    }
  }

  const entity = transformResult.entity

  // ── Conflict detection ──
  // Check if we already have a sync_state for this external entity
  const existing = await getSyncStateByExternalId(source, entity.external_id)
  let conflict = false

  if (existing && existing.status === 'active') {
    // Check for bidirectional conflict:
    // If the external entity was updated AND the internal entity has been
    // modified since our last sync, we have a conflict.
    const externalUpdatedAt = entity.external_updated_at
    const lastSyncedAt = existing.last_synced_at
    const internalUpdatedAt = existing.metadata.internal_updated_at as string | undefined

    if (externalUpdatedAt && internalUpdatedAt && lastSyncedAt) {
      const externalChanged = new Date(externalUpdatedAt) > new Date(lastSyncedAt)
      const internalChanged = new Date(internalUpdatedAt) > new Date(lastSyncedAt)

      if (externalChanged && internalChanged) {
        conflict = true

        const conflictState = await markConflict(
          existing.id,
          'Both external and internal entities changed since last sync',
          {
            external_updated_at: externalUpdatedAt,
            internal_updated_at: internalUpdatedAt,
            last_synced_at: lastSyncedAt,
            inbound_entity: {
              title: entity.title,
              status: entity.status,
              raw_status: entity.raw_status,
            },
          }
        )

        // Emit sync.conflict event
        await emitSyncEvent('conflict', source, entity.external_id, {
          sync_state_id: existing.id,
          reason: 'Bidirectional conflict detected',
          external_updated_at: externalUpdatedAt,
          internal_updated_at: internalUpdatedAt,
        }, event.trace_id)

        recordSuccess(source) // The API call itself succeeded
        return {
          success: true,
          sync_state: conflictState ?? existing,
          entity,
          errors: [],
          conflict: true,
        }
      }
    }
  }

  // ── Upsert sync_state ──
  const internalType = entity.internal_type ?? 'kanban_card'
  const internalId = existing?.internal_id ?? generateInternalId(entity)

  const syncState = await upsertSyncState({
    source,
    external_id: entity.external_id,
    internal_type: internalType,
    internal_id: internalId,
    sync_direction: existing?.sync_direction === 'outbound' ? 'bidirectional' : 'inbound',
    status: 'active',
    metadata: {
      ...(existing?.metadata ?? {}),
      etag: (payload.raw as Record<string, unknown> | undefined)?.etag ?? existing?.metadata.etag,
      external_updated_at: entity.external_updated_at ?? new Date().toISOString(),
      last_error: null,
      retry_count: 0,
      entity_title: entity.title,
      entity_status: entity.status,
      entity_raw_status: entity.raw_status,
    },
  })

  if (!syncState) {
    recordFailure(source)
    return {
      success: false,
      errors: ['Failed to upsert sync_state record'],
      conflict: false,
    }
  }

  // ── Emit sync.inbound event ──
  await emitSyncEvent('inbound', source, entity.external_id, {
    sync_state_id: syncState.id,
    internal_type: internalType,
    internal_id: internalId,
    entity_title: entity.title,
    entity_status: entity.status,
    partial: entity._meta.partial,
    warnings: entity._meta.warnings,
  }, event.trace_id)

  recordSuccess(source)

  return {
    success: true,
    sync_state: syncState,
    entity,
    errors,
    conflict,
  }
}

// ── Outbound Sync ────────────────────────────────────────────

/**
 * Push an internal status change back to an external system.
 *
 * Called when an internal entity (kanban card, bender task) changes status
 * and needs to be reflected in the external system.
 *
 * Pipeline:
 * 1. Look up sync_state records for the internal entity
 * 2. For each linked external system:
 *    a. Check circuit breaker
 *    b. Push the status update (connector-specific logic)
 *    c. Update sync_state with new timestamp
 *    d. Emit sync.outbound event
 *
 * Idempotency: Pushing the same status twice is a no-op for the external
 * system (same status = no change). The sync_state timestamp updates but
 * the external entity state doesn't change.
 *
 * @param internalType - Type of the internal entity
 * @param internalId - ID of the internal entity
 * @param newStatus - The new status to push to external systems
 * @param statusMap - Reverse mapping: internal status -> external status per source
 * @returns OutboundSyncResult[] — one per linked external system
 */
export async function processOutboundChange(
  internalType: SyncState['internal_type'],
  internalId: string,
  newStatus: string,
  statusMap?: Record<string, Record<string, string>>
): Promise<OutboundSyncResult[]> {
  const results: OutboundSyncResult[] = []

  // Find all external systems linked to this internal entity
  const syncStates = await getSyncStatesByInternalId(internalType, internalId)

  if (syncStates.length === 0) {
    return results // No external mappings — nothing to push
  }

  for (const syncState of syncStates) {
    const source = syncState.source
    const externalId = syncState.external_id

    // Skip if sync direction is inbound-only
    if (syncState.sync_direction === 'inbound') {
      continue
    }

    // Skip if sync state is in conflict or error
    if (syncState.status === 'conflict' || syncState.status === 'error') {
      results.push({
        success: false,
        external_id: externalId,
        source,
        error: `Sync state is "${syncState.status}" — resolve before pushing`,
      })
      continue
    }

    // Circuit breaker check
    if (!isSourceAllowed(source)) {
      const status = getBreakerStatus(source)
      results.push({
        success: false,
        external_id: externalId,
        source,
        error: `Circuit breaker open for "${source}" (${status?.failure_count}/${status?.failure_threshold} failures)`,
      })
      continue
    }

    // Map internal status to external status
    const sourceStatusMap = statusMap?.[source]
    const externalStatus = sourceStatusMap?.[newStatus] ?? newStatus

    // Push to external system
    // The actual HTTP push is a placeholder — connector-specific push logic
    // will be implemented per connector (e.g., Jira REST API transition call).
    // For now, we record the intent and update sync_state.
    try {
      await pushToExternal(source, externalId, externalStatus, syncState)

      // Update sync_state with new timestamp and record the push
      const metadata = {
        ...syncState.metadata,
        last_pushed_status: externalStatus,
        last_pushed_at: new Date().toISOString(),
        internal_updated_at: new Date().toISOString(),
        last_error: null,
      }

      // At this point sync_direction is 'outbound' or 'bidirectional'
      // (inbound-only mappings were skipped above). Keep current direction.
      await updateSyncState(syncState.id, {
        status: 'active',
        last_synced_at: new Date().toISOString(),
        sync_direction: syncState.sync_direction,
        metadata,
      })

      // Emit sync.outbound event
      await emitSyncEvent('outbound', source, externalId, {
        sync_state_id: syncState.id,
        internal_type: internalType,
        internal_id: internalId,
        pushed_status: externalStatus,
        internal_status: newStatus,
      })

      recordSuccess(source)

      results.push({
        success: true,
        external_id: externalId,
        source,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      recordFailure(source)

      // Mark the sync state as error
      await markError(syncState.id, errorMessage)

      // Emit sync.error event
      await emitSyncEvent('error', source, externalId, {
        sync_state_id: syncState.id,
        error: errorMessage,
        internal_type: internalType,
        internal_id: internalId,
      })

      results.push({
        success: false,
        external_id: externalId,
        source,
        error: errorMessage,
      })
    }
  }

  return results
}

// ── Reconciliation ───────────────────────────────────────────

/**
 * Reconcile sync states for a given source.
 *
 * Scans all active sync_state records for a source and checks for staleness.
 * Records that haven't been updated within the stale threshold are marked 'stale'.
 *
 * This is a maintenance operation, not part of the normal sync flow.
 * Call it periodically or on-demand to keep sync_state clean.
 *
 * @param source - The external source to reconcile (or undefined for all sources)
 * @param staleThresholdMs - How old a sync must be to count as stale (default: 24h)
 * @returns Summary of reconciliation results
 */
export async function reconcile(
  source?: string,
  staleThresholdMs: number = 24 * 60 * 60 * 1000
): Promise<{ checked: number; stale: number; errors: number }> {
  const filter: { source?: string; status?: SyncState['status'] } = { status: 'active' }
  if (source) filter.source = source

  const states = await listSyncStates(filter)
  const now = Date.now()
  let stale = 0
  let errors = 0

  for (const state of states) {
    const lastSynced = new Date(state.last_synced_at).getTime()
    const age = now - lastSynced

    if (age > staleThresholdMs) {
      const updated = await updateSyncState(state.id, { status: 'stale' })
      if (updated) {
        stale++
      } else {
        errors++
      }
    }
  }

  return {
    checked: states.length,
    stale,
    errors,
  }
}

// ── Manual Sync Trigger ──────────────────────────────────────

/**
 * Manually trigger a sync for all active mappings of a source.
 *
 * This re-processes all active sync states for the given source by
 * pushing the current internal state outbound. Useful for:
 * - Recovery after circuit breaker opens/closes
 * - Manual re-sync after conflict resolution
 * - Initial sync setup
 *
 * @param source - The source to sync
 * @returns SyncResult with push/fail counts
 */
export async function triggerManualSync(source: string): Promise<SyncResult> {
  const result: SyncResult = { pushed: 0, failed: 0, errors: [] }

  // Check circuit breaker first
  if (!isSourceAllowed(source)) {
    const status = getBreakerStatus(source)
    result.errors.push({
      external_id: '*',
      error: `Circuit breaker open for "${source}" (${status?.failure_count}/${status?.failure_threshold} failures). Cannot sync.`,
    })
    result.failed = 1
    return result
  }

  // Get all active sync states for this source
  const states = await listSyncStates({ source, status: 'active' })

  for (const state of states) {
    // Skip inbound-only mappings
    if (state.sync_direction === 'inbound') continue

    try {
      const lastPushedStatus = state.metadata.last_pushed_status as string | undefined
      if (lastPushedStatus) {
        await pushToExternal(source, state.external_id, lastPushedStatus, state)
      }

      await updateSyncState(state.id, {
        last_synced_at: new Date().toISOString(),
      })

      recordSuccess(source)
      result.pushed++
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      recordFailure(source)
      result.failed++
      result.errors.push({
        external_id: state.external_id,
        error: errorMessage,
      })
    }
  }

  return result
}

// ── Internal Helpers ─────────────────────────────────────────

/**
 * Generate an internal ID for a new entity mapping.
 *
 * For now, uses a prefixed UUID. When actual kanban card creation is
 * implemented, this would create the card and return its ID.
 */
function generateInternalId(entity: InternalEntity): string {
  const prefix = entity.internal_type === 'bender_task'
    ? 'bt'
    : entity.internal_type === 'project'
      ? 'proj'
      : 'kc'
  return `${prefix}_${crypto.randomUUID()}`
}

/**
 * Push a status update to an external system.
 *
 * This is the connector-specific push logic placeholder.
 * Each connector will implement its own push mechanism:
 * - Jira: POST /rest/api/2/issue/{key}/transitions
 * - Linear: GraphQL mutation
 * - GCal: PATCH event
 *
 * For TASK-011, this establishes the interface. Actual HTTP calls
 * will be added as connectors implement push support.
 *
 * @throws Error if the push fails (caught by caller for circuit breaker)
 */
async function pushToExternal(
  source: string,
  externalId: string,
  status: string,
  _syncState: SyncState
): Promise<void> {
  // Connector push registry — extensible per source
  // When connectors implement push(), register them here.
  //
  // For now, this is a structured no-op that logs the push intent.
  // The sync_state is updated by the caller regardless, so the
  // mapping and metadata tracking is fully functional.
  console.info(
    `[CREEP/sync] Push intent: ${source}/${externalId} -> status "${status}" ` +
    `(connector push not yet implemented for "${source}")`
  )
}

/**
 * Emit a typed sync event into the CREEP pipeline.
 */
async function emitSyncEvent(
  type: 'inbound' | 'outbound' | 'conflict' | 'error',
  source: string,
  externalId: string,
  details: Record<string, unknown>,
  traceId?: string | null
): Promise<void> {
  const eventType = EVENT_TYPES.sync[type]
  const summaries: Record<string, string> = {
    inbound: `Inbound sync: ${source}/${externalId}`,
    outbound: `Outbound push: ${source}/${externalId}`,
    conflict: `Sync conflict: ${source}/${externalId}`,
    error: `Sync error: ${source}/${externalId}`,
  }

  try {
    await emitEvent({
      type: eventType,
      source: `webhook.${source}`,
      summary: summaries[type],
      payload: {
        external_id: externalId,
        sync_source: source,
        ...details,
      },
      trace_id: traceId ?? generateTraceId(),
    })
  } catch (err) {
    // Sync event emission failure should not break the sync operation
    console.error(
      `[CREEP/sync] Failed to emit ${eventType} event for ${source}/${externalId}:`,
      err
    )
  }
}
