import { NextResponse } from 'next/server'
import { getDataSource } from '@/lib/server/github-client'
import { withCache } from '@/lib/server/cache'
import { parseSkillList } from '@/lib/server/parsers/skill'
import type { ApiResponse, ApiError } from '@/types/api'
import type { Skill } from '@/types/skill'

const TTL_MS = 10 * 60 * 1000 // 10 minutes

export async function GET(): Promise<
  NextResponse<ApiResponse<Skill[]> | ApiError>
> {
  try {
    const ds = getDataSource()

    const { data, cached } = await withCache(
      'skills:all',
      TTL_MS,
      async () => {
        const file = await ds.getFile('tools/dea-skilllist.md')
        if (!file) {
          throw new Error('Skill list not found')
        }

        return parseSkillList(file.content)
      }
    )

    return NextResponse.json({ data, cached })
  } catch (error) {
    console.error('Error fetching skills:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch skills',
        },
      },
      { status: 500 }
    )
  }
}
