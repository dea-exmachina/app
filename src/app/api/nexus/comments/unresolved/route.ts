/**
 * NEXUS Unresolved Comments API — batch counts for badge/notification display
 *
 * GET /api/nexus/comments/unresolved?project_id=xxx
 * Returns cards with unresolved comments + counts.
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { CardCommentSummary } from '@/types/nexus'

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('project_id')

    // Step 1: Get all unresolved comments
    const { data: comments, error: commentsError } = await tables.nexus_comments
      .select('card_id, comment_type, created_at')
      .eq('resolved', false)

    if (commentsError) {
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: commentsError.message } },
        { status: 500 }
      )
    }

    if (!comments || comments.length === 0) {
      return NextResponse.json({ data: [], cached: false })
    }

    // Step 2: Get card display IDs for all affected cards
    const cardUuids = [...new Set(comments.map((c: { card_id: string }) => c.card_id))]

    let cardsQuery = tables.nexus_cards
      .select('id, card_id, project_id')
      .in('id', cardUuids)

    if (projectId) {
      cardsQuery = cardsQuery.eq('project_id', projectId)
    }

    const { data: cards, error: cardsError } = await cardsQuery

    if (cardsError) {
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: cardsError.message } },
        { status: 500 }
      )
    }

    // Build UUID → display ID lookup
    const cardLookup = new Map<string, string>()
    for (const card of cards ?? []) {
      cardLookup.set(card.id as string, card.card_id as string)
    }

    // Step 3: Aggregate in memory
    const summaryMap = new Map<string, CardCommentSummary>()

    for (const row of comments) {
      const cardUuid = row.card_id as string
      const displayId = cardLookup.get(cardUuid)

      // Skip comments for cards not in the requested project
      if (!displayId) continue

      let summary = summaryMap.get(cardUuid)
      if (!summary) {
        summary = {
          card_id: displayId,
          card_display_id: displayId,
          unresolved_count: 0,
          has_questions: false,
          has_rejections: false,
          latest_comment_at: null,
        }
        summaryMap.set(cardUuid, summary)
      }

      summary.unresolved_count++
      if (row.comment_type === 'question') summary.has_questions = true
      if (row.comment_type === 'rejection') summary.has_rejections = true

      const commentDate = row.created_at as string
      if (!summary.latest_comment_at || commentDate > summary.latest_comment_at) {
        summary.latest_comment_at = commentDate
      }
    }

    const data: CardCommentSummary[] = Array.from(summaryMap.values())

    return NextResponse.json({ data, cached: false })
  } catch (error) {
    console.error('GET /api/nexus/comments/unresolved error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch unresolved comments' } },
      { status: 500 }
    )
  }
}
