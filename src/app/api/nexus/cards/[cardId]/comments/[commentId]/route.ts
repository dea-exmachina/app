/**
 * NEXUS Comment Actions API — resolve individual comments
 *
 * PATCH /api/nexus/cards/[cardId]/comments/[commentId]
 * Body: { resolved: true }
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string; commentId: string }> }
) {
  try {
    const { cardId, commentId } = await params
    const uuid = await resolveCardUuid(cardId)

    if (!uuid) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Card not found: ${cardId}` } },
        { status: 404 }
      )
    }

    const body = await request.json()

    if (body.resolved !== true) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Only { resolved: true } is supported' } },
        { status: 400 }
      )
    }

    const { data, error } = await tables.nexus_comments
      .update({
        resolved: true,
        resolved_by: 'user',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .eq('card_id', uuid)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'UPDATE_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Comment not found: ${commentId}` } },
        { status: 404 }
      )
    }

    return NextResponse.json({ data, cached: false })
  } catch (error) {
    console.error('PATCH /api/nexus/cards/[cardId]/comments/[commentId] error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to resolve comment' } },
      { status: 500 }
    )
  }
}
