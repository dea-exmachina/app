import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/research/reports/[id]
 * Get a single report by id or slug (checks both).
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    const { data, error } = await tables.research_reports
      .select('*')
      .or(`id.eq.${id},slug.eq.${id}`)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Report not found' } },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, cached: false })
  } catch (error) {
    console.error('GET /api/research/reports/[id] error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch report' } },
      { status: 500 }
    )
  }
}
