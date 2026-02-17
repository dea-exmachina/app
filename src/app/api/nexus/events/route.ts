/**
 * NEXUS Audit Trail API — Unified event history
 *
 * GET /api/nexus/events?category=card&action=lane_changed&actor=dea&card_id=NEXUS-066&since=2026-02-06&limit=50
 *
 * Replaces legacy nexus_events with unified audit_log (NEXUS-069)
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { AuditCategory, AuditSource } from '@/types/audit'

const MAX_LIMIT = 1000
const DEFAULT_LIMIT = 50

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const category = params.get('category') as AuditCategory | null
    const action = params.get('action')
    const eventId = params.get('event_id')
    const actor = params.get('actor')
    const actorType = params.get('actor_type')
    const cardId = params.get('card_id')
    const entityType = params.get('entity_type')
    const entityId = params.get('entity_id')
    const projectId = params.get('project_id')
    const source = params.get('source') as AuditSource | null
    const since = params.get('since')
    const until = params.get('until')
    const limit = Math.min(
      parseInt(params.get('limit') || String(DEFAULT_LIMIT), 10),
      MAX_LIMIT
    )
    const offset = parseInt(params.get('offset') || '0', 10)

    let query = tables.audit_log
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (category) query = query.eq('category', category)
    if (action) query = query.eq('action', action)
    if (eventId) query = query.eq('event_id', eventId)
    if (actor) query = query.eq('actor', actor)
    if (actorType) query = query.eq('actor_type', actorType)
    if (cardId) query = query.eq('card_id', cardId)
    if (entityType) query = query.eq('entity_type', entityType)
    if (entityId) query = query.eq('entity_id', entityId)
    if (projectId) query = query.eq('project_id', projectId)
    if (source) query = query.eq('source', source)
    if (since) query = query.gte('created_at', since)
    if (until) query = query.lte('created_at', until)

    const { data, error, count } = await query
    if (error) {
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data,
      total: count ?? 0,
      limit,
      offset,
      has_more: (count ?? 0) > offset + limit,
    })
  } catch (error) {
    console.error('GET /api/nexus/events error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list audit events' } },
      { status: 500 }
    )
  }
}
