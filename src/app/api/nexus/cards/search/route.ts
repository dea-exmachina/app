/**
 * Card Search API
 *
 * GET /api/nexus/cards/search?q=<query>&limit=10
 * Searches card_id and title using ilike
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q') ?? ''
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '10'), 50)

    if (!q.trim()) {
      return NextResponse.json({ data: [], cached: false })
    }

    const pattern = `%${q.trim()}%`

    const { data, error } = await tables.nexus_cards
      .select('card_id, title, lane, project_id')
      .or(`card_id.ilike.${pattern},title.ilike.${pattern}`)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: { message: error.message } }, { status: 500 })
    }

    const results = (data ?? []).map((row: Record<string, unknown>) => ({
      cardId: row.card_id,
      title: row.title,
      lane: row.lane,
      projectId: row.project_id,
    }))

    return NextResponse.json({ data: results, cached: false })
  } catch (err) {
    console.error('Card search error:', err)
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
