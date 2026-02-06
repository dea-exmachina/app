import { NextRequest, NextResponse } from 'next/server'
import { getDataSource } from '@/lib/server/github-client'
import { withCache } from '@/lib/server/cache'
import { parseBenderTeam } from '@/lib/server/parsers/bender-team'
import type { ApiResponse, ApiError } from '@/types/api'
import type { BenderTeam } from '@/types/bender'

const TTL_MS = 30 * 60 * 1000 // 30 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
): Promise<NextResponse<ApiResponse<BenderTeam> | ApiError>> {
  try {
    const { name } = await params
    const ds = getDataSource()

    const { data, cached } = await withCache(
      `benders:teams:${name}`,
      TTL_MS,
      async () => {
        const path = `benders/teams/${name}.md`
        const file = await ds.getFile(path)

        if (!file) {
          throw new Error(`Team '${name}' not found`)
        }

        return parseBenderTeam(file.content, file.path)
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

    console.error('Error fetching team:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch team',
        },
      },
      { status: 500 }
    )
  }
}
