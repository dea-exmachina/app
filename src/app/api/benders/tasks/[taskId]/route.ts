import { NextRequest, NextResponse } from 'next/server'
import { getDataSource } from '@/lib/server/github-client'
import { withCache } from '@/lib/server/cache'
import { parseBenderTask } from '@/lib/server/parsers/bender-task'
import type { ApiResponse, ApiError } from '@/types/api'
import type { BenderTask } from '@/types/bender'

const TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
): Promise<NextResponse<ApiResponse<BenderTask> | ApiError>> {
  try {
    const { taskId } = await params
    const ds = getDataSource()

    const { data, cached } = await withCache(
      `benders:tasks:${taskId}`,
      TTL_MS,
      async () => {
        // Search in both tasks and archive directories
        const activeFiles = await ds.listDirectory('inbox/bender-box/tasks')
        const archiveFiles = await ds.listDirectory(
          'inbox/bender-box/archive'
        )

        const allFiles = [
          ...activeFiles.filter((f) => f.includes(taskId)),
          ...archiveFiles.filter((f) => f.includes(taskId)),
        ]

        if (allFiles.length === 0) {
          throw new Error(`Task '${taskId}' not found`)
        }

        const file = await ds.getFile(allFiles[0])
        if (!file) {
          throw new Error(`Task '${taskId}' not found`)
        }

        return parseBenderTask(file.content, file.path)
      }
    )

    return NextResponse.json({ data, cached })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('not found')) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message,
          },
        },
        { status: 404 }
      )
    }

    console.error('Error fetching task:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch task',
        },
      },
      { status: 500 }
    )
  }
}
