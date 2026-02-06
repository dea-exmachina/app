import { NextResponse } from 'next/server'
import { getDataSource } from '@/lib/server/github-client'
import { withCache } from '@/lib/server/cache'
import { parseBenderTeam } from '@/lib/server/parsers/bender-team'
import type { ApiResponse, ApiError } from '@/types/api'
import type { BenderTeam } from '@/types/bender'

const TTL_MS = 30 * 60 * 1000 // 30 minutes

export async function GET(): Promise<
  NextResponse<ApiResponse<BenderTeam[]> | ApiError>
> {
  try {
    const ds = getDataSource()

    const { data, cached } = await withCache(
      'benders:teams:all',
      TTL_MS,
      async () => {
        const files = await ds.listDirectory('benders/teams')
        const teamFiles = files.filter(
          (f) => f.endsWith('.md') && !f.endsWith('README.md')
        )

        const teams = await Promise.all(
          teamFiles.map(async (path) => {
            const file = await ds.getFile(path)
            if (!file) return null

            return parseBenderTeam(file.content, file.path)
          })
        )

        return teams.filter((t): t is BenderTeam => t !== null)
      }
    )

    return NextResponse.json({ data, cached })
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch bender teams',
        },
      },
      { status: 500 }
    )
  }
}
