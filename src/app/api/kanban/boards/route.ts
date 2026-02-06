import { NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { BoardSummary, KanbanLane } from '@/types/kanban'

export async function GET(): Promise<
  NextResponse<ApiResponse<BoardSummary[]> | ApiError>
> {
  try {
    const { data, error } = await tables.kanban_boards
      .select('*')
      .order('name')

    if (error) {
      throw error
    }

    const summaries: BoardSummary[] = (data ?? []).map((row) => {
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
