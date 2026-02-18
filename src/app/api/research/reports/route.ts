import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

/**
 * GET /api/research/reports
 * List reports. Supports ?subscription_id=... and ?status=ready filters.
 * Ordered by report_date DESC, limited to 50 by default.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get('subscription_id')
    const status = searchParams.get('status')
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 500) : 50

    let query = tables.research_reports
      .select('*')
      .order('report_date', { ascending: false })
      .limit(limit)

    if (subscriptionId) {
      query = query.eq('subscription_id', subscriptionId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, cached: false })
  } catch (error) {
    console.error('GET /api/research/reports error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch reports' } },
      { status: 500 }
    )
  }
}
