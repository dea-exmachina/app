import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { KanbanBoard, KanbanCard, KanbanLane } from '@/types/kanban'

/**
 * GET /api/kanban/unified — Unified board showing cards across ALL projects
 *
 * Query params:
 *   ?project=<slug>  — filter to a single project (omit for all)
 *   ?view=bender     — show bender lanes instead of standard lanes
 */

const STANDARD_LANES = ['backlog', 'ready', 'in_progress', 'review', 'done'] as const
const LANE_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  ready: 'Ready',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

interface NexusCardRow {
  id: string
  card_id: string
  lane: string
  bender_lane: string | null
  title: string
  summary: string | null
  card_type: string
  delegation_tag: string
  assigned_to: string | null
  assigned_model: string | null
  priority: string
  source: string | null
  tags: string[] | null
  subtasks: Array<{ id: string; title: string; completed: boolean }> | null
  due_date: string | null
  completed_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  parent_id: string | null
  ready_for_production: boolean
  project_id: string
}

function mapToKanbanCard(row: NexusCardRow, projectSlug?: string): KanbanCard {
  const metadata: Record<string, string> = {}
  if (projectSlug) metadata['Project'] = projectSlug
  if (row.assigned_to) metadata['Assignee'] = row.assigned_to
  if (row.source) metadata['Source'] = row.source
  if (row.card_type) metadata['Type'] = row.card_type
  if (row.delegation_tag) metadata['Delegation'] = row.delegation_tag
  if (row.priority && row.priority !== 'normal') metadata['Priority'] = row.priority
  if (row.assigned_model) metadata['Model'] = row.assigned_model
  if (row.bender_lane) metadata['Bender Lane'] = row.bender_lane
  if (row.due_date) metadata['Due'] = row.due_date
  if (row.parent_id) metadata['Has Parent'] = 'yes'

  if (row.metadata) {
    for (const [k, v] of Object.entries(row.metadata)) {
      if (typeof v === 'string' && !metadata[k]) {
        metadata[k] = v
      }
    }
  }

  let description = row.summary || null
  if (row.subtasks && row.subtasks.length > 0) {
    const done = row.subtasks.filter(s => s.completed).length
    const subtaskLines = row.subtasks.map(s => `${s.completed ? '[x]' : '[ ]'} ${s.title}`).join('\n')
    const prefix = description ? `${description}\n\n` : ''
    description = `${prefix}Subtasks (${done}/${row.subtasks.length}):\n${subtaskLines}`
  }

  return {
    id: row.card_id,
    title: row.title,
    completed: row.lane === 'done',
    tags: row.tags ?? [],
    description,
    metadata,
    rawMarkdown: '',
    startedAt: row.lane === 'in_progress' || row.lane === 'review' || row.lane === 'done'
      ? (row.metadata as Record<string, string>)?.started_at || row.updated_at
      : null,
    completedAt: row.completed_at ?? null,
    createdAt: row.created_at,
    readyForProduction: row.ready_for_production ?? false,
  }
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<KanbanBoard> | ApiError>> {
  try {
    const { searchParams } = new URL(request.url)
    const projectFilter = searchParams.get('project')

    // Fetch all projects for slug lookup
    const { data: projects, error: projError } = await tables.nexus_projects
      .select('id, slug, name')
      .order('name')

    if (projError) throw projError

    const projectMap = new Map(
      ((projects ?? []) as Array<{ id: string; slug: string; name: string }>)
        .map(p => [p.id, p.slug])
    )

    // Build card query
    let query = tables.nexus_cards
      .select('*')
      .order('created_at', { ascending: true })

    // Filter by project slug if provided
    if (projectFilter) {
      const matchedProject = ((projects ?? []) as Array<{ id: string; slug: string }>)
        .find(p => p.slug === projectFilter)
      if (matchedProject) {
        query = query.eq('project_id', matchedProject.id)
      }
    }

    const { data: cards, error: cardsError } = await query

    if (cardsError) throw cardsError

    const allCards = (cards ?? []) as NexusCardRow[]

    // Group cards into lanes
    const lanes: KanbanLane[] = STANDARD_LANES.map(lane => ({
      name: LANE_LABELS[lane],
      cards: allCards
        .filter(c => c.lane === lane)
        .map(c => mapToKanbanCard(c, projectMap.get(c.project_id))),
    }))

    const board: KanbanBoard = {
      id: 'unified',
      name: projectFilter
        ? `${projectFilter} Board`
        : 'All Projects',
      filePath: '',
      handoff: null,
      lanes,
    }

    return NextResponse.json({ data: board, cached: false })
  } catch (error) {
    console.error('Error fetching unified board:', error)
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Failed to fetch unified board' } },
      { status: 500 }
    )
  }
}
