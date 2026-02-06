import { NextResponse } from 'next/server'
import { getDataSource } from '@/lib/server/github-client'
import { withCache } from '@/lib/server/cache'
import { parseKanbanBoard } from '@/lib/server/parsers/kanban'
import type { ApiResponse, ApiError } from '@/types/api'
import type { HandoffSection } from '@/types/kanban'

const TTL_MS = 2 * 60 * 1000 // 2 minutes

export async function GET(): Promise<
  NextResponse<ApiResponse<HandoffSection> | ApiError>
> {
  try {
    const ds = getDataSource()

    const { data, cached } = await withCache(
      'dashboard:handoff',
      TTL_MS,
      async () => {
        const file = await ds.getFile('kanban/management.md')
        if (!file) {
          throw new Error('Management board not found')
        }

        const board = parseKanbanBoard(file.content, 'management', file.path)

        if (!board.handoff) {
          throw new Error('Handoff section not found in management board')
        }

        return board.handoff
      }
    )

    return NextResponse.json({ data, cached })
  } catch (error) {
    console.error('Error fetching handoff:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch handoff section',
        },
      },
      { status: 500 }
    )
  }
}
