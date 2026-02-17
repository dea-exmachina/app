import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { AgentHealthUpdate } from '@/types/creep'

// PUT /api/creep/agents/:name — Update agent health
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params // Next.js 16: async params

  try {
    const body: AgentHealthUpdate = await request.json()

    // Upsert: create if doesn't exist, update if does
    const updateData: Record<string, unknown> = {
      agent_name: name,
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    }

    if (body.status) updateData.status = body.status
    if (body.current_task !== undefined) updateData.current_task = body.current_task
    if (body.metrics) updateData.metrics = body.metrics

    // Check if agent exists
    const { data: existing } = await tables.agent_health
      .select('id')
      .eq('agent_name', name)
      .single()

    let result
    if (existing) {
      const { data, error } = await tables.agent_health
        .update(updateData)
        .eq('agent_name', name)
        .select()
        .single()
      if (error) throw error
      result = data
    } else {
      // Need platform for insert
      if (!updateData.platform) updateData.platform = 'unknown'
      const { data, error } = await tables.agent_health
        .insert(updateData)
        .select()
        .single()
      if (error) throw error
      result = data
    }

    return NextResponse.json({ data: result, cached: false })
  } catch (error) {
    console.error('Error updating agent health:', error)
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 })
  }
}
