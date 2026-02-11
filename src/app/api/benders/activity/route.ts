import { NextResponse } from 'next/server'
import { db } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'

/**
 * GET /api/benders/activity — Active bender sessions with current tasks
 */

interface BenderActivity {
  agent: string
  model: string
  status: 'active' | 'idle' | 'completed'
  started_at: string
  task_code: string | null
  task_title: string | null
}

export async function GET(): Promise<
  NextResponse<ApiResponse<BenderActivity[]> | ApiError>
> {
  try {
    // Query active sessions (last 24h)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: sessions, error: sessionsError } = await (db as any)
      .from('nexus_agent_sessions')
      .select('agent, model, status, started_at, metadata')
      .gte('started_at', twentyFourHoursAgo)
      .order('started_at', { ascending: false })

    if (sessionsError) throw sessionsError

    // Map sessions to activity records
    const activities: BenderActivity[] = (sessions ?? []).map((session: any) => {
      const metadata = session.metadata || {}
      return {
        agent: session.agent,
        model: session.model,
        status: session.status,
        started_at: session.started_at,
        task_code: metadata.task_code || null,
        task_title: metadata.task_title || null,
      }
    })

    return NextResponse.json({ data: activities, cached: false })
  } catch (error) {
    console.error('Error fetching bender activity:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch bender activity',
        },
      },
      { status: 500 }
    )
  }
}
