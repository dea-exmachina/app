import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

/**
 * GET /api/activity — Recent system activity from audit_log
 *
 * Query params:
 *   limit    - max rows (default 30)
 *   category - filter by category (card, bender, system, sprint, ...)
 *   actor    - filter by actor ('dea', 'bender+atlas', 'system', ...)
 *   project_id - filter by project_id
 *   since    - ISO timestamp lower bound on created_at
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') ?? '30', 10)
    const category = searchParams.get('category')
    const actor = searchParams.get('actor')
    const project_id = searchParams.get('project_id')
    const since = searchParams.get('since')

    let query = tables.audit_log
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (category) query = query.eq('category', category)
    if (actor) query = query.eq('actor', actor)
    if (project_id) query = query.eq('project_id', project_id)
    if (since) query = query.gte('created_at', since)

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data: data ?? [], cached: false })
  } catch (err) {
    console.error('Activity GET error:', err)
    return NextResponse.json(
      { error: { message: 'Failed to fetch activity' } },
      { status: 500 }
    )
  }
}
