import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * POST /api/research/subscriptions/[id]/resume
 * Sets subscription status back to 'active'. Pipeline will pick it up on next run.
 */
export async function POST(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    const { data, error } = await tables.research_subscriptions
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, status')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Subscription not found' } },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: { code: 'UPDATE_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, cached: false })
  } catch (error) {
    console.error('POST /api/research/subscriptions/[id]/resume error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to resume subscription' } },
      { status: 500 }
    )
  }
}
