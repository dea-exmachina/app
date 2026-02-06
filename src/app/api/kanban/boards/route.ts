import { NextResponse } from 'next/server'
import { getDataSource } from '@/lib/server/github-client'
import { withCache } from '@/lib/server/cache'
import { parseKanbanBoard } from '@/lib/server/parsers/kanban'
import { BOARD_MAP } from '@/config/boards'
import type { ApiResponse, ApiError } from '@/types/api'
import type { BoardSummary } from '@/types/kanban'

const TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function GET(): Promise<
  NextResponse<ApiResponse<BoardSummary[]> | ApiError>
> {
  try {
    const ds = getDataSource()

    const { data, cached } = await withCache(
      'kanban:boards:all',
      TTL_MS,
      async () => {
        const summaries: BoardSummary[] = []

        for (const [id, config] of Object.entries(BOARD_MAP)) {
          const file = await ds.getFile(config.path)
          if (!file) continue

          const board = parseKanbanBoard(file.content, id, file.path)

          const laneStats = board.lanes.map((lane) => ({
            name: lane.name,
            total: lane.cards.length,
            completed: lane.cards.filter((c) => c.completed).length,
          }))

          const totalOpen = board.lanes.reduce(
            (sum, lane) =>
              sum + lane.cards.filter((c) => !c.completed).length,
            0
          )
          const totalCompleted = board.lanes.reduce(
            (sum, lane) => sum + lane.cards.filter((c) => c.completed).length,
            0
          )

          summaries.push({
            id,
            name: config.name,
            filePath: config.path,
            laneStats,
            totalOpen,
            totalCompleted,
          })
        }

        return summaries
      }
    )

    return NextResponse.json({ data, cached })
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
