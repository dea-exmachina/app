/**
 * Sync State CRUD — Supabase operations for the sync_state table
 *
 * Provides typed access to the entity mapping table that links
 * external system entities to internal representations.
 *
 * The sync_state table is the source of truth for:
 * - What external entity maps to what internal entity?
 * - When was it last synced?
 * - Is there a conflict? An error?
 * - What metadata (etag, timestamps) do we have for conflict detection?
 *
 * All operations are idempotent — upserting the same external_id + source
 * produces the same result regardless of how many times it runs.
 *
 * TASK-011 | Phase 2 Bidirectional Sync Engine
 */

import { tables } from '@/lib/server/database'
import type { SyncState } from '@/types/creep'

// ── Types ────────────────────────────────────────────────────

export interface SyncStateCreate {
  source: string
  external_id: string
  internal_type: SyncState['internal_type']
  internal_id: string
  sync_direction?: SyncState['sync_direction']
  status?: SyncState['status']
  metadata?: Record<string, unknown>
}

export interface SyncStateUpdate {
  internal_id?: string
  internal_type?: SyncState['internal_type']
  sync_direction?: SyncState['sync_direction']
  status?: SyncState['status']
  last_synced_at?: string
  metadata?: Record<string, unknown>
}

export interface SyncStateFilter {
  source?: string
  status?: SyncState['status']
  internal_type?: SyncState['internal_type']
  sync_direction?: SyncState['sync_direction']
  limit?: number
}

// ── Read Operations ─────────────────────────────────────────

/**
 * Get a sync state record by its primary key (UUID).
 */
export async function getSyncState(id: string): Promise<SyncState | null> {
  const { data, error } = await tables.sync_state
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as SyncState
}

/**
 * Look up a sync state record by the external entity identity.
 *
 * This is the primary lookup path for both inbound and outbound sync:
 * - Inbound: "I received a webhook from Jira for PROJ-123 — do I have a mapping?"
 * - Outbound: "Internal card changed — which external entity does it map to?"
 *
 * Uses the UNIQUE(source, external_id) constraint for efficient lookup.
 */
export async function getSyncStateByExternalId(
  source: string,
  externalId: string
): Promise<SyncState | null> {
  const { data, error } = await tables.sync_state
    .select('*')
    .eq('source', source)
    .eq('external_id', externalId)
    .single()

  if (error || !data) return null
  return data as SyncState
}

/**
 * Look up sync state records by internal entity identity.
 *
 * One internal entity might be synced to multiple external systems
 * (e.g., a kanban card synced to both Jira and Linear).
 */
export async function getSyncStatesByInternalId(
  internalType: SyncState['internal_type'],
  internalId: string
): Promise<SyncState[]> {
  const { data, error } = await tables.sync_state
    .select('*')
    .eq('internal_type', internalType)
    .eq('internal_id', internalId)

  if (error || !data) return []
  return data as SyncState[]
}

/**
 * List sync state records with optional filters.
 */
export async function listSyncStates(filter?: SyncStateFilter): Promise<SyncState[]> {
  let query = tables.sync_state
    .select('*')
    .order('last_synced_at', { ascending: false })

  if (filter?.source) {
    query = query.eq('source', filter.source)
  }
  if (filter?.status) {
    query = query.eq('status', filter.status)
  }
  if (filter?.internal_type) {
    query = query.eq('internal_type', filter.internal_type)
  }
  if (filter?.sync_direction) {
    query = query.eq('sync_direction', filter.sync_direction)
  }

  const limit = Math.min(filter?.limit ?? 100, 200)
  query = query.limit(limit)

  const { data, error } = await query

  if (error) {
    console.error('[CREEP/sync] Error listing sync states:', error)
    return []
  }

  return (data ?? []) as SyncState[]
}

// ── Write Operations ────────────────────────────────────────

/**
 * Create or update a sync state record.
 *
 * Upserts on the UNIQUE(source, external_id) constraint.
 * This is the idempotency mechanism — processing the same webhook
 * twice produces the same sync_state row (updated, not duplicated).
 *
 * @param input - The sync state data to upsert
 * @returns The upserted sync state record
 */
export async function upsertSyncState(input: SyncStateCreate): Promise<SyncState | null> {
  const row = {
    source: input.source,
    external_id: input.external_id,
    internal_type: input.internal_type,
    internal_id: input.internal_id,
    sync_direction: input.sync_direction ?? 'inbound',
    status: input.status ?? 'active',
    last_synced_at: new Date().toISOString(),
    metadata: input.metadata ?? {},
  }

  const { data, error } = await tables.sync_state
    .upsert(row, { onConflict: 'source,external_id' })
    .select()
    .single()

  if (error) {
    console.error('[CREEP/sync] Error upserting sync state:', error)
    return null
  }

  return data as SyncState
}

/**
 * Update specific fields of an existing sync state record.
 *
 * @param id - The UUID of the sync state record
 * @param updates - The fields to update
 * @returns The updated record, or null if not found
 */
export async function updateSyncState(
  id: string,
  updates: SyncStateUpdate
): Promise<SyncState | null> {
  const row: Record<string, unknown> = {}

  if (updates.internal_id !== undefined) row.internal_id = updates.internal_id
  if (updates.internal_type !== undefined) row.internal_type = updates.internal_type
  if (updates.sync_direction !== undefined) row.sync_direction = updates.sync_direction
  if (updates.status !== undefined) row.status = updates.status
  if (updates.last_synced_at !== undefined) row.last_synced_at = updates.last_synced_at
  if (updates.metadata !== undefined) row.metadata = updates.metadata

  if (Object.keys(row).length === 0) return getSyncState(id)

  const { data, error } = await tables.sync_state
    .update(row)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[CREEP/sync] Error updating sync state:', error)
    return null
  }

  return data as SyncState
}

/**
 * Mark a sync state record as having a conflict.
 *
 * Sets status to 'conflict' and stores conflict details in metadata.
 * Conflict resolution is manual — the record stays in 'conflict' until
 * explicitly resolved via updateSyncState() or resolveConflict().
 *
 * @param id - The UUID of the sync state record
 * @param reason - Human-readable description of the conflict
 * @param details - Additional conflict data for debugging
 */
export async function markConflict(
  id: string,
  reason: string,
  details?: Record<string, unknown>
): Promise<SyncState | null> {
  // Fetch current metadata to preserve existing fields
  const current = await getSyncState(id)
  if (!current) return null

  const metadata = {
    ...current.metadata,
    conflict_reason: reason,
    conflict_detected_at: new Date().toISOString(),
    conflict_details: details ?? {},
  }

  return updateSyncState(id, {
    status: 'conflict',
    metadata,
  })
}

/**
 * Mark a sync state record as having an error.
 *
 * Records the error and increments retry_count in metadata.
 *
 * @param id - The UUID of the sync state record
 * @param errorMessage - What went wrong
 */
export async function markError(
  id: string,
  errorMessage: string
): Promise<SyncState | null> {
  const current = await getSyncState(id)
  if (!current) return null

  const retryCount = (current.metadata.retry_count as number | undefined) ?? 0

  const metadata = {
    ...current.metadata,
    last_error: errorMessage,
    last_error_at: new Date().toISOString(),
    retry_count: retryCount + 1,
  }

  return updateSyncState(id, {
    status: 'error',
    metadata,
  })
}

/**
 * Resolve a conflict on a sync state record.
 *
 * Sets the status back to 'active' and records the resolution.
 *
 * @param id - The UUID of the sync state record
 * @param resolution - How the conflict was resolved
 * @param direction - Which direction to force: 'inbound' (external wins) or 'outbound' (internal wins)
 */
export async function resolveConflict(
  id: string,
  resolution: string,
  direction: 'inbound' | 'outbound'
): Promise<SyncState | null> {
  const current = await getSyncState(id)
  if (!current) return null

  const metadata = {
    ...current.metadata,
    conflict_reason: undefined,
    conflict_details: undefined,
    conflict_resolved_at: new Date().toISOString(),
    conflict_resolution: resolution,
    conflict_resolved_direction: direction,
  }

  return updateSyncState(id, {
    status: 'active',
    last_synced_at: new Date().toISOString(),
    metadata,
  })
}
