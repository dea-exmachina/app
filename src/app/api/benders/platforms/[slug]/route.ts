import { NextRequest, NextResponse } from 'next/server'
import { getDataSource } from '@/lib/server/github-client'
import { withCache } from '@/lib/server/cache'
import { parsePlatformRegistry } from '@/lib/server/parsers/bender-platform'
import type { ApiResponse, ApiError } from '@/types/api'
import type { BenderPlatform } from '@/types/bender'

const TTL_MS = 30 * 60 * 1000 // 30 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse<ApiResponse<BenderPlatform> | ApiError>> {
  try {
    const { slug } = await params
    const ds = getDataSource()

    const { data, cached } = await withCache(
      `benders:platforms:${slug}`,
      TTL_MS,
      async () => {
        const file = await ds.getFile(
          'benders/context/shared/platform-registry.md'
        )
        if (!file) {
          throw new Error('Platform registry not found')
        }

        const platforms = parsePlatformRegistry(file.content)
        const platform = platforms.find((p) => p.slug === slug)

        if (!platform) {
          throw new Error(`Platform '${slug}' not found`)
        }

        return platform
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

    console.error('Error fetching platform:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch platform',
        },
      },
      { status: 500 }
    )
  }
}
