import { NextResponse } from 'next/server'
import { getDataSource } from '@/lib/server/github-client'
import { withCache } from '@/lib/server/cache'
import { parseWorkflow } from '@/lib/server/parsers/workflow'
import type { ApiResponse, ApiError } from '@/types/api'
import type { Workflow } from '@/types/workflow'

const TTL_MS = 10 * 60 * 1000 // 10 minutes

export async function GET(): Promise<
  NextResponse<ApiResponse<Workflow[]> | ApiError>
> {
  try {
    const ds = getDataSource()

    const { data, cached } = await withCache(
      'workflows:all',
      TTL_MS,
      async () => {
        const files = await ds.listDirectory('workflows/public')
        const workflowFiles = files.filter((f) => f.endsWith('.md'))

        const workflows = await Promise.all(
          workflowFiles.map(async (path) => {
            const file = await ds.getFile(path)
            if (!file) return null

            return parseWorkflow(file.content, file.path)
          })
        )

        return workflows.filter((w): w is Workflow => w !== null)
      }
    )

    return NextResponse.json({ data, cached })
  } catch (error) {
    console.error('Error fetching workflows:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch workflows',
        },
      },
      { status: 500 }
    )
  }
}
