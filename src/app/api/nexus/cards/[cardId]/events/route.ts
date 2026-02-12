/**
 * NEXUS Card Events API — Event history for a specific card
 *
 * GET /api/nexus/cards/[cardId]/events?type=card.moved&limit=50
 *
 * DEA-042 | Phase 1
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

async function resolveCardUuid(cardId: string): Promise<string | null> {
  const { data } = await tables.nexus_cards
    .select('id')
    .eq('card_id', cardId)
    .single()
  return data?.id ?? null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params
    const uuid = await resolveCardUuid(cardId)

    if (!uuid) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Card not found: ${cardId}` } },
        { status: 404 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const since = searchParams.get('since')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    let query = tables.nexus_events
      .select('*')
      .eq('card_id', uuid)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 200))

    if (type) query = query.like('event_type', `${type}%`)
    if (since) query = query.gte('created_at', since)

    const { data, error } = await query
    if (error) {
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, cached: false })
  } catch (error) {
    console.error('GET /api/nexus/cards/[cardId]/events error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list card events' } },
      { status: 500 }
    )
  }
}
