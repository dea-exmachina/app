import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

// POST /api/creep/agents/:name/heartbeat — Touch last activity
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params

  try {
    const now = new Date().toISOString()

    // Upsert heartbeat
    const { data: existing } = await tables.agent_health
      .select('id, status')
      .eq('agent_name', name)
      .single()

    if (existing) {
      const updateData: Record<string, unknown> = {
        last_activity_at: now,
        updated_at: now,
      }
      // If agent was stuck/idle, mark active on heartbeat
      if (existing.status === 'stuck' || existing.status === 'idle') {
        updateData.status = 'active'
      }

      await tables.agent_health
        .update(updateData)
        .eq('agent_name', name)
    } else {
      await tables.agent_health.insert({
        agent_name: name,
        platform: 'unknown',
        status: 'active',
        last_activity_at: now,
        updated_at: now,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error recording heartbeat:', error)
    return NextResponse.json({ error: 'Failed to record heartbeat' }, { status: 500 })
  }
}
