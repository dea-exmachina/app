import { NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

const DEFAULT_STUCK_THRESHOLD = 900 // 15 minutes in seconds

// GET /api/creep/agents — List all agents, run stuck detection
export async function GET() {
  try {
    const { data: agents, error } = await tables.agent_health
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching agent health:', error)
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
    }

    // Stuck detection: check each active agent
    const now = Date.now()
    const stuckAgents: string[] = []

    for (const agent of agents ?? []) {
      if (agent.status === 'active' || agent.status === 'idle') {
        const lastActivity = new Date(agent.last_activity_at).getTime()
        const threshold = (agent.metrics as Record<string, unknown>)?.stuck_threshold as number || DEFAULT_STUCK_THRESHOLD
        const idleSeconds = (now - lastActivity) / 1000

        if (idleSeconds > threshold) {
          stuckAgents.push(agent.agent_name)
          // Update status to stuck
          await tables.agent_health
            .update({ status: 'stuck', updated_at: new Date().toISOString() })
            .eq('agent_name', agent.agent_name)
          // Emit stuck event
          await tables.queen_events.insert({
            type: 'agent.stuck',
            source: 'system',
            actor: agent.agent_name,
            summary: `Agent ${agent.agent_name} stuck — idle for ${Math.round(idleSeconds)}s (threshold: ${threshold}s)`,
            payload: { idle_seconds: Math.round(idleSeconds), threshold, platform: agent.platform },
          })
        }
      }
    }

    // Re-fetch if any were updated
    const { data: refreshed } = stuckAgents.length > 0
      ? await tables.agent_health.select('*').order('updated_at', { ascending: false })
      : { data: agents }

    return NextResponse.json({
      data: refreshed ?? [],
      stuck_detected: stuckAgents,
      cached: false,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
