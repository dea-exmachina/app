import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

/**
 * POST /api/research/trigger
 * Manual trigger: sets next_run_at = now() so the next pipeline run picks it up.
 * Body: { subscription_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { subscription_id?: string }

    if (!body.subscription_id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'subscription_id is required' } },
        { status: 400 }
      )
    }

    const { error } = await tables.research_subscriptions
      .update({ next_run_at: new Date().toISOString() })
      .eq('id', body.subscription_id)

    if (error) {
      return NextResponse.json(
        { error: { code: 'TRIGGER_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: { triggered: true }, cached: false })
  } catch (error) {
    console.error('POST /api/research/trigger error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to trigger subscription' } },
      { status: 500 }
    )
  }
}
