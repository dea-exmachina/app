/**
 * Release Queue API Route
 *
 * GET /api/nexus/release-queue — Returns cards in review lane with filter support
 *
 * Query params:
 *   ?filter=flagged (default) — ready_for_production = true
 *   ?filter=unflagged — ready_for_production = false
 *   ?filter=all — all cards in review regardless of flag
 *
 * Always returns total_in_review (all review cards) for header ratio display.
 *
 * Council review gate: DEA-* and NEXUS-* cards get council review before release.
 * A card is BLOCKED if it has any unresolved comment where author = 'council'.
 * Silence = approval (no comment needed for full pass).
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { ReleaseQueueCard, ReleaseQueueResponse } from '@/types/nexus'

/** Prefixes that require council review before production release */
const META_PREFIXES = ['DEA', 'NEXUS']

function isMetaCard(cardId: string): boolean {
  const prefix = cardId.split('-')[0]
  return META_PREFIXES.includes(prefix)
}

type FilterMode = 'flagged' | 'unflagged' | 'all'

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ReleaseQueueResponse> | ApiError>> {
  try {
    const filter = (request.nextUrl.searchParams.get('filter') || 'flagged') as FilterMode

    // Always count total cards in review for the header ratio
    const { count: totalInReview, error: countError } = await tables.nexus_cards
      .select('*', { count: 'exact', head: true })
      .eq('lane', 'review')

    if (countError) throw countError

    // Build filtered query for review cards
    let query = tables.nexus_cards
      .select('id, card_id, title, priority, project_id, lane, updated_at, ready_for_production')
      .eq('lane', 'review')
      .order('updated_at', { ascending: false })

    if (filter === 'flagged') {
      query = query.eq('ready_for_production', true)
    } else if (filter === 'unflagged') {
      query = query.eq('ready_for_production', false)
    }
    // 'all' = no additional filter

    const { data: filteredCards, error: cardsError } = await query

    if (cardsError) throw cardsError

    const cards = (filteredCards ?? []) as Array<{
      id: string
      card_id: string
      title: string
      priority: string
      project_id: string
      lane: string
      updated_at: string
      ready_for_production: boolean
    }>

    if (cards.length === 0) {
      return NextResponse.json({
        data: {
          cards: [],
          total: 0,
          total_in_review: totalInReview ?? 0,
          blocked_count: 0,
          clear_count: 0,
          needs_review_count: 0,
        },
        cached: false,
      })
    }

    // Fetch project details for all unique project IDs
    const projectIds = [...new Set(cards.map((c) => c.project_id).filter(Boolean))]

    const { data: projects, error: projError } = await tables.nexus_projects
      .select('id, name, card_id_prefix')
      .in('id', projectIds)

    if (projError) throw projError

    const projectMap = new Map(
      ((projects ?? []) as Array<{ id: string; name: string; card_id_prefix: string }>).map(
        (p) => [p.id, p]
      )
    )

    // For meta cards, check for unresolved council comments
    const metaCardIds = cards
      .filter((c) => isMetaCard(c.card_id))
      .map((c) => c.card_id)

    const councilCommentCounts = new Map<string, number>()

    if (metaCardIds.length > 0) {
      const { data: councilComments, error: commentError } = await tables.nexus_comments
        .select('card_id')
        .eq('author', 'council')
        .eq('resolved', false)
        .in('card_id', metaCardIds)

      if (commentError) throw commentError

      for (const comment of (councilComments ?? []) as Array<{ card_id: string }>) {
        const current = councilCommentCounts.get(comment.card_id) ?? 0
        councilCommentCounts.set(comment.card_id, current + 1)
      }
    }

    // Build response cards
    let blockedCount = 0
    let clearCount = 0
    const needsReviewCount = 0

    const releaseCards: ReleaseQueueCard[] = cards.map((card) => {
      const project = projectMap.get(card.project_id)
      const isMeta = isMetaCard(card.card_id)
      const unresolvedCouncilComments = councilCommentCounts.get(card.card_id) ?? 0
      const blocked = unresolvedCouncilComments > 0
      const reviewRequired = isMeta

      if (blocked) {
        blockedCount++
      } else {
        clearCount++
      }

      return {
        card_id: card.card_id,
        title: card.title,
        priority: card.priority as ReleaseQueueCard['priority'],
        project_name: project?.name ?? 'Unknown',
        project_prefix: project?.card_id_prefix ?? '',
        lane: card.lane,
        flagged_at: card.updated_at,
        ready_for_production: card.ready_for_production,
        review_required: reviewRequired,
        blocked,
        unresolved_council_comments: unresolvedCouncilComments,
      }
    })

    return NextResponse.json({
      data: {
        cards: releaseCards,
        total: releaseCards.length,
        total_in_review: totalInReview ?? 0,
        blocked_count: blockedCount,
        clear_count: clearCount,
        needs_review_count: needsReviewCount,
      },
      cached: false,
    })
  } catch (error) {
    console.error('Error fetching release queue:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch release queue',
        },
      },
      { status: 500 }
    )
  }
}
