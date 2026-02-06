import { NextRequest, NextResponse } from 'next/server'
import { getDataSource } from '@/lib/server/github-client'
import { withCache } from '@/lib/server/cache'
import { parseWorkflow } from '@/lib/server/parsers/workflow'
import type { ApiResponse, ApiError } from '@/types/api'
import type { Workflow } from '@/types/workflow'

const TTL_MS = 10 * 60 * 1000 // 10 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
): Promise<NextResponse<ApiResponse<Workflow> | ApiError>> {
  try {
    const { name } = await params
    const ds = getDataSource()

    const { data, cached } = await withCache(
      `workflows:detail:${name}`,
      TTL_MS,
      async () => {
        const path = `workflows/public/${name}.md`
        const file = await ds.getFile(path)

        if (!file) {
          throw new Error(`Workflow '${name}' not found`)
        }

        return parseWorkflow(file.content, file.path)
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

    console.error('Error fetching workflow:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch workflow',
        },
      },
      { status: 500 }
    )
  }
}
