/**
 * Release Queue API Route
 *
 * GET /api/nexus/release-queue — Returns all cards flagged for production release
 * Queries nexus_cards where ready_for_production = true AND lane = 'review',
 * joined with nexus_projects for project context.
 */

import { NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { ReleaseQueueCard, ReleaseQueueResponse } from '@/types/nexus'

export async function GET(): Promise<
  NextResponse<ApiResponse<ReleaseQueueResponse> | ApiError>
> {
  try {
    // Fetch all cards flagged for production in review lane
    const { data: flaggedCards, error: cardsError } = await tables.nexus_cards
      .select('card_id, title, priority, project_id, lane, updated_at')
      .eq('ready_for_production', true)
      .eq('lane', 'review')
      .order('updated_at', { ascending: false })

    if (cardsError) throw cardsError

    const cards = (flaggedCards ?? []) as Array<{
      card_id: string
      title: string
      priority: string
      project_id: string
      lane: string
      updated_at: string
    }>

    if (cards.length === 0) {
      return NextResponse.json({
        data: { cards: [], total: 0 },
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

    // Build response cards with project info
    const releaseCards: ReleaseQueueCard[] = cards.map((card) => {
      const project = projectMap.get(card.project_id)
      return {
        card_id: card.card_id,
        title: card.title,
        priority: card.priority as ReleaseQueueCard['priority'],
        project_name: project?.name ?? 'Unknown',
        project_prefix: project?.card_id_prefix ?? '',
        lane: card.lane,
        flagged_at: card.updated_at,
      }
    })

    return NextResponse.json({
      data: { cards: releaseCards, total: releaseCards.length },
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
