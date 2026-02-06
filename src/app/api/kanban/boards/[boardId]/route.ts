import { NextRequest, NextResponse } from 'next/server'
import { getDataSource } from '@/lib/server/github-client'
import { withCache } from '@/lib/server/cache'
import { parseKanbanBoard } from '@/lib/server/parsers/kanban'
import { BOARD_MAP } from '@/config/boards'
import type { ApiResponse, ApiError } from '@/types/api'
import type { KanbanBoard } from '@/types/kanban'

const TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
): Promise<NextResponse<ApiResponse<KanbanBoard> | ApiError>> {
  try {
    const { boardId } = await params
    const config = BOARD_MAP[boardId]

    if (!config) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `Board '${boardId}' not found`,
          },
        },
        { status: 404 }
      )
    }

    const ds = getDataSource()

    const { data, cached } = await withCache(
      `kanban:board:${boardId}`,
      TTL_MS,
      async () => {
        const file = await ds.getFile(config.path)
        if (!file) {
          throw new Error(`Board file not found: ${config.path}`)
        }

        return parseKanbanBoard(file.content, boardId, file.path)
      }
    )

    return NextResponse.json({ data, cached })
  } catch (error) {
    console.error('Error fetching board:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch board',
        },
      },
      { status: 500 }
    )
  }
}
