import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { QueenEventCreate } from '@/types/queen'

// GET /api/queen/events — List events with optional filters
// Query params: type, source, project, since, limit, trace_id
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const type = params.get('type')
  const source = params.get('source')
  const project = params.get('project')
  const since = params.get('since')
  const traceId = params.get('trace_id')
  const limit = parseInt(params.get('limit') || '50', 10)

  try {
    let query = tables.queen_events
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 200)) // cap at 200

    if (type) query = query.like('type', `${type}%`) // prefix match: "agent.*" → "agent.%"
    if (source) query = query.eq('source', source)
    if (project) query = query.eq('project', project)
    if (since) query = query.gte('created_at', since)
    if (traceId) query = query.eq('trace_id', traceId)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching queen events:', error)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [], cached: false })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/queen/events — Emit a new event
export async function POST(request: NextRequest) {
  try {
    const body: QueenEventCreate = await request.json()

    if (!body.type || !body.source || !body.summary) {
      return NextResponse.json(
        { error: 'type, source, and summary are required' },
        { status: 400 }
      )
    }

    const { data, error } = await tables.queen_events
      .insert({
        type: body.type,
        source: body.source,
        actor: body.actor || null,
        summary: body.summary,
        payload: body.payload || {},
        trace_id: body.trace_id || null,
        project: body.project || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating queen event:', error)
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
    }

    return NextResponse.json({ data, cached: false }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
