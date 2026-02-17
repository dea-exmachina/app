import { NextRequest, NextResponse } from 'next/server'
import { tables, generateSlug } from '@/lib/server/database'
import type { ResearchSubscriptionCreate } from '@/types/research'

/**
 * Calculate next_run_at from frequency + schedule settings.
 * All times are UTC.
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
    // scheduleDay: 1=Mon..7=Sun
    const currentDay = target.getUTCDay() || 7 // Convert Sun=0 to 7
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
 * GET /api/research/subscriptions
 * List all subscriptions. Supports ?status=active filter.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 500) : 50

    let query = tables.research_subscriptions
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

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
    console.error('GET /api/research/subscriptions error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch subscriptions' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/research/subscriptions
 * Create a new subscription. Required: name, keywords.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ResearchSubscriptionCreate

    if (!body.name || !body.keywords || body.keywords.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'name and keywords are required' } },
        { status: 400 }
      )
    }

    const slug = body.slug || generateSlug(body.name)
    const frequency = body.frequency ?? 'weekly'
    const scheduleDay = body.schedule_day ?? 1
    const scheduleHour = body.schedule_hour ?? 8

    const nextRunAt = calculateNextRun(frequency, scheduleDay, scheduleHour)

    const { data, error } = await tables.research_subscriptions
      .insert({
        name: body.name,
        slug,
        description: body.description ?? null,
        keywords: body.keywords,
        excluded_keywords: body.excluded_keywords ?? [],
        data_sources: body.data_sources ?? [],
        search_depth: body.search_depth ?? 3,
        frequency,
        schedule_day: scheduleDay,
        schedule_hour: scheduleHour,
        next_run_at: nextRunAt,
        recipients: body.recipients ?? [],
        branding: body.branding ?? {},
        status: body.status ?? 'active',
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'CREATE_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, cached: false }, { status: 201 })
  } catch (error) {
    console.error('POST /api/research/subscriptions error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create subscription' } },
      { status: 500 }
    )
  }
}
