/**
 * NEXUS Sessions API — Agent session tracking
 *
 * GET  /api/nexus/sessions?status=active&agent=dea
 * POST /api/nexus/sessions  { agent, model?, card_id? }
 *
 * DEA-042 | Phase 1
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { NexusAgentSessionCreate } from '@/types/nexus'

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const status = params.get('status') || 'active'
    const agent = params.get('agent')

    let query = tables.nexus_agent_sessions
      .select('*')
      .order('started_at', { ascending: false })

    if (status !== 'all') query = query.eq('status', status)
    if (agent) query = query.eq('agent', agent)

    const { data, error } = await query.limit(50)
    if (error) {
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, cached: false })
  } catch (error) {
    console.error('GET /api/nexus/sessions error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list sessions' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: NexusAgentSessionCreate = await request.json()

    if (!body.agent) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'agent is required' } },
        { status: 400 }
      )
    }

    // Resolve card_id text → UUID if provided
    let resolvedCardId: string | null = null
    if (body.card_id) {
      const { data: card } = await tables.nexus_cards
        .select('id')
        .eq('card_id', body.card_id)
        .single()
      resolvedCardId = card?.id ?? null
    }

    const { data, error } = await tables.nexus_agent_sessions
      .insert({
        agent: body.agent,
        model: body.model ?? null,
        card_id: resolvedCardId,
        metadata: body.metadata ?? {},
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'CREATE_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    // Emit session event
    await tables.nexus_events.insert({
      event_type: 'session.started',
      card_id: resolvedCardId,
      actor: body.agent,
      payload: { session_id: data.id, agent: body.agent, model: body.model },
    })

    return NextResponse.json({ data, cached: false }, { status: 201 })
  } catch (error) {
    console.error('POST /api/nexus/sessions error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to start session' } },
      { status: 500 }
    )
  }
}
