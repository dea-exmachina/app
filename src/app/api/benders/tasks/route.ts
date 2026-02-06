import { NextResponse } from 'next/server'
import { getDataSource } from '@/lib/server/github-client'
import { withCache } from '@/lib/server/cache'
import { parseBenderTask } from '@/lib/server/parsers/bender-task'
import type { ApiResponse, ApiError } from '@/types/api'
import type { BenderTask } from '@/types/bender'

const TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function GET(): Promise<
  NextResponse<ApiResponse<BenderTask[]> | ApiError>
> {
  try {
    const ds = getDataSource()

    const { data, cached } = await withCache(
      'benders:tasks:all',
      TTL_MS,
      async () => {
        // Get both active tasks and archived tasks
        const activeFiles = await ds.listDirectory('inbox/bender-box/tasks')
        const archiveFiles = await ds.listDirectory(
          'inbox/bender-box/archive'
        )

        const allFiles = [
          ...activeFiles.filter((f) => f.endsWith('.md')),
          ...archiveFiles.filter((f) => f.endsWith('.md')),
        ]

        const tasks = await Promise.all(
          allFiles.map(async (path) => {
            const file = await ds.getFile(path)
            if (!file) return null

            return parseBenderTask(file.content, file.path)
          })
        )

        return tasks.filter((t): t is BenderTask => t !== null)
      }
    )

    return NextResponse.json({ data, cached })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch bender tasks',
        },
      },
      { status: 500 }
    )
  }
}
