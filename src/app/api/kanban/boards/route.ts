import { NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { BoardSummary } from '@/types/kanban'

/**
 * GET /api/kanban/boards — List all boards (backed by nexus_projects)
 *
 * Returns BoardSummary[] with lane stats computed from nexus_cards.
 */

const STANDARD_LANES = ['backlog', 'ready', 'in_progress', 'review', 'done'] as const
const LANE_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  ready: 'Ready',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

export async function GET(): Promise<
  NextResponse<ApiResponse<BoardSummary[]> | ApiError>
> {
  try {
    // Fetch all projects
    const { data: projects, error: projError } = await tables.nexus_projects
      .select('id, slug, name')
      .order('name')

    if (projError) throw projError

    // Fetch all cards (lightweight: just id, project_id, lane, completed_at)
    const { data: cards, error: cardsError } = await tables.nexus_cards
      .select('project_id, lane, completed_at')

    if (cardsError) throw cardsError

    const allCards = (cards ?? []) as Array<{ project_id: string; lane: string; completed_at: string | null }>

    const summaries: BoardSummary[] = (projects ?? []).map((project: Record<string, unknown>) => {
      const projectCards = allCards.filter(c => c.project_id === project.id)

      const laneStats = STANDARD_LANES.map(lane => {
        const laneCards = projectCards.filter(c => c.lane === lane)
        return {
          name: LANE_LABELS[lane],
          total: laneCards.length,
          completed: laneCards.filter(c => c.lane === 'done').length,
        }
      })

      const totalCompleted = projectCards.filter(c => c.lane === 'done').length
      const totalOpen = projectCards.length - totalCompleted

      return {
        id: project.slug as string,
        name: project.name as string,
        filePath: '',
        laneStats,
        totalOpen,
        totalCompleted,
      }
    })

    return NextResponse.json({ data: summaries, cached: false })
  } catch (error) {
    console.error('Error fetching boards:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch board summaries',
        },
      },
      { status: 500 }
    )
  }
}
