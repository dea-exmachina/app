import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/server/database'

/**
 * POST /api/kanban/sprints/[id]/rollover
 *
 * Closes the given sprint and opens a new one.
 * Carries forward cards in ready/in_progress lanes that have sprint_id = this sprint.
 * Returns a preview when ?preview=true (no DB changes).
 */

function nextSprintName(): string {
  const now = new Date()
  const year = now.getFullYear()
  // ISO week number
  const startOfYear = new Date(year, 0, 1)
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000)
  const week = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7)
  return `Sprint ${year}-W${String(week + 1).padStart(2, '0')}`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb()
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const preview = searchParams.get('preview') === 'true'

    // Fetch the sprint being rolled over
    const { data: sprint, error: sprintErr } = await db
      .from('nexus_sprints')
      .select('*')
      .eq('id', id)
      .single()

    if (sprintErr || !sprint) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Sprint not found' } }, { status: 404 })
    }

    // Find carry-forward cards (ready or in_progress assigned to this sprint)
    const { data: carryCards, error: cardsErr } = await db
      .from('nexus_cards')
      .select('id, card_id, title, lane, priority, blocked_by, sprint_id')
      .eq('sprint_id', id)
      .in('lane', ['ready', 'in_progress'])

    if (cardsErr) throw cardsErr

    const cards = (carryCards ?? []) as Array<{
      id: string
      card_id: string
      title: string
      lane: string
      priority: string
      blocked_by: string[]
      sprint_id: string | null
    }>

    // Filter out cards that are blocked (blocked_by has entries)
    const toCarry = cards.filter(c => !c.blocked_by || c.blocked_by.length === 0)
    const blocked = cards.filter(c => c.blocked_by && c.blocked_by.length > 0)

    const newSprintName = nextSprintName()
    const newStartDate = new Date().toISOString().split('T')[0]
    const newEndDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

    if (preview) {
      return NextResponse.json({
        data: {
          currentSprint: sprint,
          newSprintName,
          carryForward: toCarry.map(c => ({ card_id: c.card_id, title: c.title, lane: c.lane })),
          blocked: blocked.map(c => ({ card_id: c.card_id, title: c.title })),
          dropped: [], // cards assigned to sprint but in done/backlog — left as-is
        },
        cached: false,
      })
    }

    // Execute rollover:
    // 1. Close current sprint
    await db
      .from('nexus_sprints')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', id)

    // 2. Create new sprint
    const { data: newSprint, error: newSprintErr } = await db
      .from('nexus_sprints')
      .insert({
        name: newSprintName,
        goal: '',
        status: 'active',
        start_date: newStartDate,
        end_date: newEndDate,
      })
      .select()
      .single()

    if (newSprintErr || !newSprint) throw newSprintErr ?? new Error('Failed to create sprint')

    // 3. Move carry-forward cards to new sprint
    if (toCarry.length > 0) {
      await db
        .from('nexus_cards')
        .update({ sprint_id: newSprint.id, updated_at: new Date().toISOString() })
        .in('id', toCarry.map(c => c.id))
    }

    return NextResponse.json({
      data: {
        closedSprint: sprint,
        newSprint,
        carried: toCarry.length,
        blocked: blocked.length,
      },
      cached: false,
    })
  } catch (err) {
    console.error('POST /api/kanban/sprints/[id]/rollover error:', err)
    return NextResponse.json({ error: { code: 'ROLLOVER_ERROR', message: 'Rollover failed' } }, { status: 500 })
  }
}
