import { NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { HandoffSection } from '@/types/kanban'

export async function GET(): Promise<
  NextResponse<ApiResponse<HandoffSection> | ApiError>
> {
  try {
    const { data, error } = await tables.kanban_boards
      .select('*')
      .eq('slug', 'management')
      .single()

    if (error) throw error

    const handoff = (data as Record<string, unknown>)?.handoff as HandoffSection | null

    if (!handoff) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Handoff section not found in management board',
          },
        },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: handoff, cached: false })
  } catch (error) {
    console.error('Error fetching handoff:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch handoff section',
        },
      },
      { status: 500 }
    )
  }
}
