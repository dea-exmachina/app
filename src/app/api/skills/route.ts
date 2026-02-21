import { NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { Skill } from '@/types/skill'

export async function GET(): Promise<
  NextResponse<ApiResponse<Skill[]> | ApiError>
> {
  try {
    const { data, error } = await tables.skills
      .select('name, description, category, workflow, status, updated_at')
      .order('category')
      .order('name')

    if (error) {
      throw error
    }

    return NextResponse.json({ data: data as Skill[], cached: false })
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
