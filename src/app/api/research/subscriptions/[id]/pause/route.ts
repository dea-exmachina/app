import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * POST /api/research/subscriptions/[id]/pause
 * Sets subscription status to 'paused'. Pipeline skips paused subscriptions.
 */
export async function POST(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    const { data, error } = await tables.research_subscriptions
      .update({ status: 'paused', updated_at: new Date().toISOString() })
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
    console.error('POST /api/research/subscriptions/[id]/pause error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to pause subscription' } },
      { status: 500 }
    )
  }
}
