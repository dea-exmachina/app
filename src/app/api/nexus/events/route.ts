/**
 * NEXUS Events API — Audit trail and event history
 *
 * GET /api/nexus/events?type=card.moved&actor=dea&since=2026-02-06&limit=50
 *
 * DEA-042 | Phase 1
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const type = params.get('type')
    const actor = params.get('actor')
    const cardId = params.get('card_id')
    const since = params.get('since')
    const limit = parseInt(params.get('limit') || '50', 10)

    let query = tables.nexus_events
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 200))

    if (type) query = query.like('event_type', `${type}%`)
    if (actor) query = query.eq('actor', actor)
    if (since) query = query.gte('created_at', since)

    // card_id filter requires resolving text ID → UUID
    if (cardId) {
      const { data: card } = await tables.nexus_cards
        .select('id')
        .eq('card_id', cardId)
        .single()

      if (!card) {
        return NextResponse.json({ data: [], cached: false })
      }
      query = query.eq('card_id', card.id)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, cached: false })
  } catch (error) {
    console.error('GET /api/nexus/events error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list events' } },
      { status: 500 }
    )
  }
}
