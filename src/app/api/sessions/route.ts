import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'

interface SessionEntry {
  id: string
  agent: string
  model: string | null
  cardId: string | null
  status: 'active' | 'idle' | 'completed'
  startedAt: string
  endedAt: string | null
  durationMinutes: number | null
}

interface SessionsResponse {
  sessions: SessionEntry[]
  total: number
  activeCount: number
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<SessionsResponse> | ApiError>> {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)
    const status = searchParams.get('status') // 'active' | 'completed' | null (all)

    let query = (db as any)
      .from('nexus_agent_sessions')
      .select('id, agent, model, card_id, status, started_at, ended_at, metadata')
      .order('started_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: rows, error } = await query

    if (error) throw error

    const sessions: SessionEntry[] = (rows ?? []).map((r: Record<string, unknown>) => {
      const startedAt = r.started_at as string
      const endedAt = r.ended_at as string | null
      let durationMinutes: number | null = null
      if (endedAt) {
        durationMinutes = Math.round(
          (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000
        )
      }
      return {
        id: r.id as string,
        agent: r.agent as string,
        model: r.model as string | null,
        cardId: r.card_id as string | null,
        status: r.status as SessionEntry['status'],
        startedAt,
        endedAt,
        durationMinutes,
      }
    })

    const activeCount = sessions.filter(s => s.status === 'active').length

    return NextResponse.json({
      data: { sessions, total: sessions.length, activeCount },
      cached: false,
    })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Failed to fetch sessions' } },
      { status: 500 }
    )
  }
}
