import { NextResponse } from 'next/server'
import { getDataSource } from '@/lib/server/github-client'
import { withCache } from '@/lib/server/cache'
import type { ApiResponse, ApiError } from '@/types/api'
import type { RateLimit } from '@/types/api'

const TTL_MS = 1 * 60 * 1000 // 1 minute

export async function GET(): Promise<
  NextResponse<ApiResponse<RateLimit> | ApiError>
> {
  try {
    const ds = getDataSource()

    const { data, cached } = await withCache(
      'github:rate-limit',
      TTL_MS,
      async () => {
        const status = await ds.getStatus()

        if (!status.connected || !status.rateLimit) {
          throw new Error('Unable to fetch rate limit')
        }

        const rateLimit: RateLimit = {
          limit: status.rateLimit.limit,
          remaining: status.rateLimit.remaining,
          reset: status.rateLimit.reset,
          used: status.rateLimit.used,
        }

        return rateLimit
      }
    )

    return NextResponse.json({ data, cached })
  } catch (error) {
    console.error('Error fetching rate limit:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch GitHub rate limit',
        },
      },
      { status: 500 }
    )
  }
}
