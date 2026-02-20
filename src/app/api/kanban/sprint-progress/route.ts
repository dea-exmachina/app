import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

/**
 * GET /api/kanban/sprint-progress
 *
 * Returns sprint completion progress for a date range.
 *
 * Query params:
 *   done_after   YYYY-MM-DD — start of range (default: Monday of current week)
 *   done_before  YYYY-MM-DD — end of range (default: Sunday of current week)
 *   project_slug — optional filter to a single project
 *
 * Response:
 *   { total, done, percent, date_from, date_to }
 */

function getCurrentWeekBounds(): { from: string; to: string } {
  const now = new Date()
  const day = now.getUTCDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - ((day + 6) % 7))
  monday.setUTCHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  sunday.setUTCHours(23, 59, 59, 999)

  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(monday), to: fmt(sunday) }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const projectSlug = searchParams.get('project_slug') ?? null

    const defaults = getCurrentWeekBounds()
    const dateFrom = searchParams.get('done_after') ?? defaults.from
    const dateTo = searchParams.get('done_before') ?? defaults.to

    // Build the range timestamps (inclusive day boundaries)
    const rangeStart = `${dateFrom}T00:00:00.000Z`
    const rangeEnd = `${dateTo}T23:59:59.999Z`

    // Resolve project_id if project_slug provided
    let projectId: string | null = null
    if (projectSlug) {
      const { data: proj, error: projErr } = await tables.nexus_projects
        .select('id')
        .eq('slug', projectSlug)
        .single()
      if (projErr || !proj) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: `Project '${projectSlug}' not found` } },
          { status: 404 }
        )
      }
      projectId = (proj as { id: string }).id
    }

    // Total cards: created within the date range (all lanes)
    let totalQuery = tables.nexus_cards
      .select('id', { count: 'exact', head: true })
      .gte('created_at', rangeStart)
      .lte('created_at', rangeEnd)

    if (projectId) {
      totalQuery = totalQuery.eq('project_id', projectId)
    }

    const { count: totalCount, error: totalErr } = await totalQuery
    if (totalErr) throw totalErr

    // Done cards: lane = 'done' AND completed_at within the date range
    let doneQuery = tables.nexus_cards
      .select('id', { count: 'exact', head: true })
      .eq('lane', 'done')
      .gte('completed_at', rangeStart)
      .lte('completed_at', rangeEnd)

    if (projectId) {
      doneQuery = doneQuery.eq('project_id', projectId)
    }

    const { count: doneCount, error: doneErr } = await doneQuery
    if (doneErr) throw doneErr

    const total = totalCount ?? 0
    const done = doneCount ?? 0
    const percent = total === 0 ? 0 : Math.round((done / total) * 1000) / 10

    return NextResponse.json({
      total,
      done,
      percent,
      date_from: dateFrom,
      date_to: dateTo,
    })
  } catch (err) {
    console.error('GET /api/kanban/sprint-progress error:', err)
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Failed to fetch sprint progress' } },
      { status: 500 }
    )
  }
}
