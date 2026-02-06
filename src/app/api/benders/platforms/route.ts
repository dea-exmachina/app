import { NextResponse } from 'next/server'
import { getDataSource } from '@/lib/server/github-client'
import { withCache } from '@/lib/server/cache'
import { parsePlatformRegistry } from '@/lib/server/parsers/bender-platform'
import type { ApiResponse, ApiError } from '@/types/api'
import type { BenderPlatform } from '@/types/bender'

const TTL_MS = 30 * 60 * 1000 // 30 minutes

export async function GET(): Promise<
  NextResponse<ApiResponse<BenderPlatform[]> | ApiError>
> {
  try {
    const ds = getDataSource()

    const { data, cached } = await withCache(
      'benders:platforms:all',
      TTL_MS,
      async () => {
        const file = await ds.getFile(
          'benders/context/shared/platform-registry.md'
        )
        if (!file) {
          throw new Error('Platform registry not found')
        }

        return parsePlatformRegistry(file.content)
      }
    )

    return NextResponse.json({ data, cached })
  } catch (error) {
    console.error('Error fetching platforms:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch bender platforms',
        },
      },
      { status: 500 }
    )
  }
}
