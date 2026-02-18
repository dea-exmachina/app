import { NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import { fetchVaultFile } from '@/lib/server/github'
import { parseHandoffSection } from '@/lib/server/handoff-parser'
import type { ApiResponse, ApiError } from '@/types/api'
import type { DashboardSummary } from '@/types/dashboard'
import type { BoardSummary } from '@/types/kanban'

/**
 * GET /api/dashboard/summary — Dashboard overview (backed by nexus_projects + nexus_cards)
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
  NextResponse<ApiResponse<DashboardSummary> | ApiError>
> {
  try {
    // Fetch handoff + board stats in parallel
    const [handoffMd, { data: projects, error: projError }, { data: cards, error: cardsError }] =
      await Promise.all([
        fetchVaultFile('inbox/last-session.md').catch(() => null),
        tables.nexus_projects.select('id, slug, name').order('name'),
        tables.nexus_cards.select('project_id, lane, completed_at'),
      ])

    if (projError) throw projError
    if (cardsError) throw cardsError

    const handoff = handoffMd ? parseHandoffSection(handoffMd) : null

    const allCards = (cards ?? []) as Array<{ project_id: string; lane: string; completed_at: string | null }>

    const boardStats: BoardSummary[] = (projects ?? []).map((project: Record<string, unknown>) => {
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

    // Skill count
    const { count: skillCount } = await tables.skills
      .select('id', { count: 'exact', head: true })

    // Workflow count
    const { count: workflowCount } = await tables.workflows
      .select('id', { count: 'exact', head: true })

    // Active benders
    const { data: platforms } = await tables.bender_platforms
      .select('*')

    const { data: tasks } = await tables.bender_tasks
      .select('*')

    const activeBenders = (platforms ?? [])
      .filter((p) => (p as Record<string, unknown>).status === 'active')
      .map((p) => ({
        platform: (p as Record<string, unknown>).name as string,
        status: (p as Record<string, unknown>).status as string,
        activeTasks: (tasks ?? []).filter(
          (t) =>
            (t as Record<string, unknown>).status === 'executing' ||
            (t as Record<string, unknown>).status === 'delivered'
        ).length,
      }))

    const summary: DashboardSummary = {
      handoff,
      boardStats,
      activeBenders,
      skillCount: skillCount ?? 0,
      workflowCount: workflowCount ?? 0,
    }

    return NextResponse.json({ data: summary, cached: false })
  } catch (error) {
    console.error('Error fetching dashboard summary:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch dashboard summary',
        },
      },
      { status: 500 }
    )
  }
}
