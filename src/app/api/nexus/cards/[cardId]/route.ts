/**
 * NEXUS Card Detail API — Get and Update
 *
 * GET   /api/nexus/cards/[cardId]  — get card by card_id (e.g. DEA-042)
 * PATCH /api/nexus/cards/[cardId]  — update card fields (lane, assigned_to, etc.)
 *
 * DEA-042 | Phase 1
 */

import { NextRequest, NextResponse } from 'next/server'
import { db, tables } from '@/lib/server/database'
import type { NexusCardUpdate } from '@/types/nexus'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params

    const { data, error } = await tables.nexus_cards
      .select('*')
      .eq('card_id', cardId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Card not found: ${cardId}` } },
        { status: 404 }
      )
    }

    return NextResponse.json({ data, cached: false })
  } catch (error) {
    console.error('GET /api/nexus/cards/[cardId] error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get card' } },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params
    const body: NexusCardUpdate = await request.json()

    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'No fields to update' } },
        { status: 400 }
      )
    }

    // Use RPC to set app.actor so triggers record who made the change
    const actor = 'webapp'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any).rpc('update_card_with_actor', {
      p_card_id: cardId,
      p_actor: actor,
      p_updates: body,
    })

    if (error) {
      if (error.message?.includes('Card not found')) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: `Card not found: ${cardId}` } },
          { status: 404 }
        )
      }
      if (error.message?.includes('Invalid lane transition')) {
        return NextResponse.json(
          { error: { code: 'INVALID_TRANSITION', message: error.message } },
          { status: 422 }
        )
      }
      return NextResponse.json(
        { error: { code: 'UPDATE_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, cached: false })
  } catch (error) {
    console.error('PATCH /api/nexus/cards/[cardId] error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update card' } },
      { status: 500 }
    )
  }
}
