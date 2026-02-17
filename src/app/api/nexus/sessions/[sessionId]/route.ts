/**
 * NEXUS Session Detail API — End a session
 *
 * PATCH /api/nexus/sessions/[sessionId]  { status: 'completed' }
 *
 * DEA-042 | Phase 1
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const body = await request.json()

    const updates: Record<string, unknown> = {}
    if (body.status) updates.status = body.status
    if (body.status === 'completed') updates.ended_at = new Date().toISOString()

    const { data, error } = await tables.nexus_agent_sessions
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: `Session not found: ${sessionId}` } },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: { code: 'UPDATE_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    // Emit session.ended event
    if (body.status === 'completed') {
      const startedAt = data.started_at ? new Date(data.started_at as string).getTime() : 0
      await tables.nexus_events.insert({
        event_type: 'session.ended',
        card_id: data.card_id,
        actor: data.agent,
        payload: {
          session_id: sessionId,
          agent: data.agent,
          duration_ms: startedAt ? Date.now() - startedAt : null,
        },
      })
    }

    return NextResponse.json({ data, cached: false })
  } catch (error) {
    console.error('PATCH /api/nexus/sessions/[sessionId] error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update session' } },
      { status: 500 }
    )
  }
}
