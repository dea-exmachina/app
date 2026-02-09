/**
 * NEXUS Comments API — Card-scoped comments and pivots
 *
 * GET  /api/nexus/cards/[cardId]/comments?pivots_only=true
 * POST /api/nexus/cards/[cardId]/comments  { author, content, comment_type, is_pivot, pivot_impact }
 *
 * DEA-042 | Phase 1
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { NexusCommentCreate } from '@/types/nexus'

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
    const pivotsOnly = searchParams.get('pivots_only') === 'true'
    const unresolvedOnly = searchParams.get('unresolved_only') === 'true'

    let query = tables.nexus_comments
      .select('*')
      .eq('card_id', uuid)
      .order('created_at', { ascending: true })

    if (pivotsOnly) query = query.eq('is_pivot', true)
    if (unresolvedOnly) query = query.eq('resolved', false)

    const { data, error } = await query
    if (error) {
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, cached: false })
  } catch (error) {
    console.error('GET /api/nexus/cards/[cardId]/comments error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list comments' } },
      { status: 500 }
    )
  }
}

export async function POST(
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

    const body: Omit<NexusCommentCreate, 'card_id'> = await request.json()

    if (!body.author || !body.content) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'author and content are required' } },
        { status: 400 }
      )
    }

    // Validate author: dea, user, bender, or bender+{slug}
    const validAuthor = ['dea', 'user', 'bender'].includes(body.author)
      || /^bender\+[a-z0-9-]+$/.test(body.author)
    if (!validAuthor) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid author. Must be dea, user, bender, or bender+{slug}' } },
        { status: 400 }
      )
    }

    const { data, error } = await tables.nexus_comments
      .insert({ ...body, card_id: uuid })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'CREATE_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    // comment event emitted by database trigger
    return NextResponse.json({ data, cached: false }, { status: 201 })
  } catch (error) {
    console.error('POST /api/nexus/cards/[cardId]/comments error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create comment' } },
      { status: 500 }
    )
  }
}
