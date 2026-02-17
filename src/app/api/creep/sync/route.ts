/**
 * GET /api/creep/sync — List sync state entries with optional filters
 * POST /api/creep/sync — Trigger a manual sync for a source
 *
 * TASK-011 | Phase 2 Bidirectional Sync Engine
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  listSyncStates,
  triggerManualSync,
  getAllBreakerStatuses,
} from '@/lib/creep/sync'
import type { SyncState } from '@/types/creep'

/**
 * GET /api/creep/sync
 *
 * Query params:
 *   source — filter by external source (e.g., "jira")
 *   status — filter by sync status ("active", "stale", "conflict", "error")
 *   internal_type — filter by internal type ("kanban_card", "bender_task", "project")
 *   direction — filter by sync direction ("inbound", "outbound", "bidirectional")
 *   limit — max results (default 100, cap 200)
 *   include_breakers — if "true", include circuit breaker statuses
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  try {
    const filter: {
      source?: string
      status?: SyncState['status']
      internal_type?: SyncState['internal_type']
      sync_direction?: SyncState['sync_direction']
      limit?: number
    } = {}

    const source = params.get('source')
    if (source) filter.source = source

    const status = params.get('status')
    if (status && ['active', 'stale', 'conflict', 'error'].includes(status)) {
      filter.status = status as SyncState['status']
    }

    const internalType = params.get('internal_type')
    if (internalType && ['kanban_card', 'bender_task', 'project'].includes(internalType)) {
      filter.internal_type = internalType as SyncState['internal_type']
    }

    const direction = params.get('direction')
    if (direction && ['inbound', 'outbound', 'bidirectional'].includes(direction)) {
      filter.sync_direction = direction as SyncState['sync_direction']
    }

    const limit = params.get('limit')
    if (limit) {
      filter.limit = parseInt(limit, 10)
    }

    const states = await listSyncStates(filter)

    // Optionally include circuit breaker statuses
    const includeBreakers = params.get('include_breakers') === 'true'
    const response: Record<string, unknown> = {
      data: states,
      count: states.length,
      cached: false,
    }

    if (includeBreakers) {
      response.circuit_breakers = getAllBreakerStatuses()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error listing sync states:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/creep/sync
 *
 * Body:
 *   { source: string } — trigger a manual sync for this source
 *
 * Pushes current internal state to all active outbound/bidirectional
 * mappings for the specified source.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.source || typeof body.source !== 'string') {
      return NextResponse.json(
        { error: 'source is required and must be a string' },
        { status: 400 }
      )
    }

    const result = await triggerManualSync(body.source)

    return NextResponse.json({
      data: result,
      cached: false,
    })
  } catch (error) {
    console.error('Error triggering manual sync:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
