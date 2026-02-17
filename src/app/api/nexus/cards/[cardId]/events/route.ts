/**
 * NEXUS Card Audit Trail API — Event history for a specific card
 *
 * GET /api/nexus/cards/[cardId]/events?category=card&action=lane_changed&limit=50
 *
 * Replaces legacy nexus_events with unified audit_log (NEXUS-069)
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { AuditCategory } from '@/types/audit'

const MAX_LIMIT = 200
const DEFAULT_LIMIT = 50

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category') as AuditCategory | null
    const action = searchParams.get('action')
    const since = searchParams.get('since')
    const limit = Math.min(
      parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10),
      MAX_LIMIT
    )

    // audit_log uses card display ID directly (denormalized) — no UUID lookup needed
    let query = tables.audit_log
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (category) query = query.eq('category', category)
    if (action) query = query.eq('action', action)
    if (since) query = query.gte('created_at', since)

    const { data, error } = await query
    if (error) {
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, total: data?.length ?? 0 })
  } catch (error) {
    console.error('GET /api/nexus/cards/[cardId]/events error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list card audit events' } },
      { status: 500 }
    )
  }
}
