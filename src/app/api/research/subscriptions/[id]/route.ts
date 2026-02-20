import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ResearchSubscriptionUpdate } from '@/types/research'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Calculate next_run_at from frequency + schedule settings.
 * Duplicated here to keep each route file self-contained.
 */
function calculateNextRun(
  frequency: string,
  scheduleDay: number,
  scheduleHour: number
): string {
  const now = new Date()
  const target = new Date(now)

  if (frequency === 'daily') {
    target.setUTCHours(scheduleHour, 0, 0, 0)
    if (target <= now) target.setUTCDate(target.getUTCDate() + 1)
  } else if (frequency === 'weekly') {
    const currentDay = target.getUTCDay() || 7
    let daysUntil = scheduleDay - currentDay
    if (daysUntil < 0 || (daysUntil === 0 && target.getUTCHours() >= scheduleHour)) {
      daysUntil += 7
    }
    target.setUTCDate(target.getUTCDate() + daysUntil)
    target.setUTCHours(scheduleHour, 0, 0, 0)
  } else if (frequency === 'biweekly') {
    const currentDay = target.getUTCDay() || 7
    let daysUntil = scheduleDay - currentDay
    if (daysUntil < 0 || (daysUntil === 0 && target.getUTCHours() >= scheduleHour)) {
      daysUntil += 14
    }
    target.setUTCDate(target.getUTCDate() + daysUntil)
    target.setUTCHours(scheduleHour, 0, 0, 0)
  } else if (frequency === 'monthly') {
    target.setUTCMonth(target.getUTCMonth() + 1, scheduleDay)
    target.setUTCHours(scheduleHour, 0, 0, 0)
  }

  return target.toISOString()
}

/**
 * GET /api/research/subscriptions/[id]
 * Get a single subscription by id.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    const { data, error } = await tables.research_subscriptions
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Subscription not found' } },
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
    console.error('GET /api/research/subscriptions/[id] error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch subscription' } },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/research/subscriptions/[id]
 * Update subscription fields. Recalculates next_run_at if schedule changed.
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as ResearchSubscriptionUpdate

    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.keywords !== undefined) updateData.keywords = body.keywords
    if (body.excluded_keywords !== undefined) updateData.excluded_keywords = body.excluded_keywords
    if (body.data_sources !== undefined) updateData.data_sources = body.data_sources
    if (body.search_depth !== undefined) updateData.search_depth = body.search_depth
    if (body.frequency !== undefined) updateData.frequency = body.frequency
    if (body.schedule_day !== undefined) updateData.schedule_day = body.schedule_day
    if (body.schedule_hour !== undefined) updateData.schedule_hour = body.schedule_hour
    if (body.reference_date !== undefined) updateData.reference_date = body.reference_date
    if (body.next_run_at !== undefined) updateData.next_run_at = body.next_run_at
    if (body.recipients !== undefined) updateData.recipients = body.recipients
    if (body.branding !== undefined) updateData.branding = body.branding
    if (body.status !== undefined) updateData.status = body.status

    // Recalculate next_run_at if any schedule field changed (unless caller set it explicitly)
    const scheduleChanged =
      body.frequency !== undefined ||
      body.schedule_day !== undefined ||
      body.schedule_hour !== undefined
    if (scheduleChanged && body.next_run_at === undefined) {
      // Fetch current values to fill in any unspecified schedule fields
      const { data: current, error: fetchError } = await tables.research_subscriptions
        .select('frequency, schedule_day, schedule_hour')
        .eq('id', id)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return NextResponse.json(
            { error: { code: 'NOT_FOUND', message: 'Subscription not found' } },
            { status: 404 }
          )
        }
        return NextResponse.json(
          { error: { code: 'FETCH_ERROR', message: fetchError.message } },
          { status: 500 }
        )
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentRow = current as any
      const frequency = (body.frequency ?? currentRow.frequency) as string
      const scheduleDay = body.schedule_day ?? currentRow.schedule_day
      const scheduleHour = body.schedule_hour ?? currentRow.schedule_hour

      updateData.next_run_at = calculateNextRun(frequency, scheduleDay, scheduleHour)
    }

    const { data, error } = await tables.research_subscriptions
      .update(updateData)
      .eq('id', id)
      .select('*')
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
    console.error('PATCH /api/research/subscriptions/[id] error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update subscription' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/research/subscriptions/[id]
 * Delete a subscription by id.
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    const { error } = await tables.research_subscriptions
      .update({ status: 'archived' })
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: { code: 'DELETE_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: { archived: true }, cached: false })
  } catch (error) {
    console.error('DELETE /api/research/subscriptions/[id] error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete subscription' } },
      { status: 500 }
    )
  }
}
