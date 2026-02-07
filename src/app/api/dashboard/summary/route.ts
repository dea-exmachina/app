import { NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { DashboardSummary } from '@/types/dashboard'
import type { BoardSummary, HandoffSection, KanbanLane } from '@/types/kanban'

export async function GET(): Promise<
  NextResponse<ApiResponse<DashboardSummary> | ApiError>
> {
  try {
    // Board stats from Supabase
    const { data: boards, error: boardsError } = await tables.kanban_boards
      .select('*')
      .order('name')

    if (boardsError) throw boardsError

    const boardStats: BoardSummary[] = (boards ?? []).map((row) => {
      const lanes = (row.lanes as unknown as KanbanLane[]) ?? []

      const laneStats = lanes.map((lane) => ({
        name: lane.name,
        total: lane.cards.length,
        completed: lane.cards.filter((c) => c.completed).length,
      }))

      const totalOpen = lanes.reduce(
        (sum, lane) => sum + lane.cards.filter((c) => !c.completed).length,
        0
      )
      const totalCompleted = lanes.reduce(
        (sum, lane) => sum + lane.cards.filter((c) => c.completed).length,
        0
      )

      return {
        id: row.slug,
        name: row.name,
        filePath: row.markdown_path ?? '',
        laneStats,
        totalOpen,
        totalCompleted,
      }
    })

    // Handoff from management board
    const mgmtBoard = (boards ?? []).find((b) => b.slug === 'management')
    const handoff = ((mgmtBoard as Record<string, unknown> | undefined)?.handoff as HandoffSection | undefined) ?? null

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
