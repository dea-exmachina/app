/**
 * GET /api/creep/sync/:id — Get sync state detail
 * PUT /api/creep/sync/:id — Resolve conflict or force sync direction
 *
 * TASK-011 | Phase 2 Bidirectional Sync Engine
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getSyncState,
  resolveConflict,
  updateSyncState,
  resetBreaker,
  processOutboundChange,
} from '@/lib/creep/sync'

/**
 * GET /api/creep/sync/:id
 *
 * Returns the full sync state record including metadata.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params // Next.js 16: async params

  try {
    const state = await getSyncState(id)

    if (!state) {
      return NextResponse.json(
        { error: `Sync state "${id}" not found` },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: state, cached: false })
  } catch (error) {
    console.error('Error fetching sync state:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/creep/sync/:id
 *
 * Actions:
 *   { action: "resolve_conflict", resolution: string, direction: "inbound"|"outbound" }
 *     — Resolve a conflict. Direction determines which side wins.
 *
 *   { action: "force_sync", status: string }
 *     — Force push a status to the external system.
 *
 *   { action: "reset_breaker" }
 *     — Reset the circuit breaker for this sync state's source.
 *
 *   { action: "update", ...fields }
 *     — Update sync state fields directly (status, sync_direction, metadata).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params // Next.js 16: async params

  try {
    const state = await getSyncState(id)
    if (!state) {
      return NextResponse.json(
        { error: `Sync state "${id}" not found` },
        { status: 404 }
      )
    }

    const body = await request.json()
    const action = body.action

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        { error: 'action is required (resolve_conflict, force_sync, reset_breaker, update)' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'resolve_conflict': {
        if (state.status !== 'conflict') {
          return NextResponse.json(
            { error: `Sync state is "${state.status}", not "conflict" — nothing to resolve` },
            { status: 400 }
          )
        }

        const resolution = body.resolution
        if (!resolution || typeof resolution !== 'string') {
          return NextResponse.json(
            { error: 'resolution is required (describe how the conflict was resolved)' },
            { status: 400 }
          )
        }

        const direction = body.direction
        if (!direction || !['inbound', 'outbound'].includes(direction)) {
          return NextResponse.json(
            { error: 'direction is required ("inbound" = external wins, "outbound" = internal wins)' },
            { status: 400 }
          )
        }

        const resolved = await resolveConflict(id, resolution, direction)
        if (!resolved) {
          return NextResponse.json(
            { error: 'Failed to resolve conflict' },
            { status: 500 }
          )
        }

        return NextResponse.json({ data: resolved, cached: false })
      }

      case 'force_sync': {
        const status = body.status
        if (!status || typeof status !== 'string') {
          return NextResponse.json(
            { error: 'status is required (the status to push to external system)' },
            { status: 400 }
          )
        }

        // Build a reverse status map from the request if provided
        const statusMap = body.status_map
          ? { [state.source]: body.status_map }
          : undefined

        const results = await processOutboundChange(
          state.internal_type,
          state.internal_id,
          status,
          statusMap
        )

        return NextResponse.json({ data: results, cached: false })
      }

      case 'reset_breaker': {
        const wasReset = resetBreaker(state.source)
        return NextResponse.json({
          data: {
            source: state.source,
            reset: wasReset,
            message: wasReset
              ? `Circuit breaker for "${state.source}" reset to closed`
              : `No circuit breaker found for "${state.source}"`,
          },
          cached: false,
        })
      }

      case 'update': {
        const updates: Record<string, unknown> = {}

        if (body.status && ['active', 'stale', 'conflict', 'error'].includes(body.status)) {
          updates.status = body.status
        }
        if (body.sync_direction && ['inbound', 'outbound', 'bidirectional'].includes(body.sync_direction)) {
          updates.sync_direction = body.sync_direction
        }
        if (body.metadata && typeof body.metadata === 'object') {
          updates.metadata = { ...state.metadata, ...body.metadata }
        }

        if (Object.keys(updates).length === 0) {
          return NextResponse.json(
            { error: 'No valid fields to update (status, sync_direction, metadata)' },
            { status: 400 }
          )
        }

        const updated = await updateSyncState(id, updates)
        if (!updated) {
          return NextResponse.json(
            { error: 'Failed to update sync state' },
            { status: 500 }
          )
        }

        return NextResponse.json({ data: updated, cached: false })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action "${action}". Valid: resolve_conflict, force_sync, reset_breaker, update` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error updating sync state:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
