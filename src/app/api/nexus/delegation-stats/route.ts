import { NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'

/**
 * GET /api/nexus/delegation-stats — Delegation ratio (BENDER vs DEA)
 */

interface DelegationStats {
  overall: {
    bender: number
    dea: number
    ratio: string
  }
  byProject: Array<{
    project: string
    bender: number
    dea: number
  }>
}

export async function GET(): Promise<
  NextResponse<ApiResponse<DelegationStats> | ApiError>
> {
  try {
    // Overall delegation counts
    const { data: cards, error: cardsError } = await tables.nexus_cards
      .select('delegation_tag, project_id')
      .not('delegation_tag', 'is', null)

    if (cardsError) throw cardsError

    const allCards = (cards ?? []) as Array<{
      delegation_tag: string
      project_id: string
    }>

    // Count by delegation tag
    const benderCount = allCards.filter(
      (c) => c.delegation_tag === 'BENDER'
    ).length
    const deaCount = allCards.filter((c) => c.delegation_tag === 'DEA').length
    const total = benderCount + deaCount

    const ratio =
      total > 0 ? `${Math.round((benderCount / total) * 100)}%` : '0%'

    // Per-project breakdown
    const { data: projects, error: projError } = await tables.nexus_projects
      .select('id, name')

    if (projError) throw projError

    const projectMap = new Map<string, string>()
    for (const proj of projects ?? []) {
      projectMap.set(
        (proj as Record<string, unknown>).id as string,
        (proj as Record<string, unknown>).name as string
      )
    }

    const byProjectMap = new Map<
      string,
      { bender: number; dea: number }
    >()

    for (const card of allCards) {
      const projectName = projectMap.get(card.project_id) || 'Unknown'
      if (!byProjectMap.has(projectName)) {
        byProjectMap.set(projectName, { bender: 0, dea: 0 })
      }
      const entry = byProjectMap.get(projectName)!
      if (card.delegation_tag === 'BENDER') {
        entry.bender++
      } else if (card.delegation_tag === 'DEA') {
        entry.dea++
      }
    }

    const byProject = Array.from(byProjectMap.entries())
      .map(([project, counts]) => ({
        project,
        bender: counts.bender,
        dea: counts.dea,
      }))
      .sort((a, b) => a.project.localeCompare(b.project))

    const stats: DelegationStats = {
      overall: {
        bender: benderCount,
        dea: deaCount,
        ratio,
      },
      byProject,
    }

    return NextResponse.json({ data: stats, cached: false })
  } catch (error) {
    console.error('Error fetching delegation stats:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch delegation stats',
        },
      },
      { status: 500 }
    )
  }
}
