import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { KanbanBoard, KanbanCard, KanbanLane } from '@/types/kanban'

/**
 * GET /api/kanban/boards/[boardId] — Get board detail (backed by nexus_projects + nexus_cards)
 *
 * boardId = project slug (e.g. "council", "control-center")
 * Returns KanbanBoard with lanes built from nexus_cards grouped by lane column.
 */

const STANDARD_LANES = ['backlog', 'ready', 'in_progress', 'review', 'done'] as const
const LANE_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  ready: 'Ready',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

const BENDER_LANES = ['proposed', 'queued', 'executing', 'delivered', 'integrated'] as const
const BENDER_LANE_LABELS: Record<string, string> = {
  proposed: 'Proposed',
  queued: 'Queued',
  executing: 'Executing',
  delivered: 'Delivered',
  integrated: 'Integrated',
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
}

/** Map a nexus_card row into a KanbanCard for the frontend */
function mapToKanbanCard(row: NexusCardRow): KanbanCard {
  const metadata: Record<string, string> = {}
  if (row.assigned_to) metadata['Assignee'] = row.assigned_to
  if (row.source) metadata['Source'] = row.source
  if (row.card_type) metadata['Type'] = row.card_type
  if (row.delegation_tag) metadata['Delegation'] = row.delegation_tag
  if (row.priority && row.priority !== 'normal') metadata['Priority'] = row.priority
  if (row.assigned_model) metadata['Model'] = row.assigned_model
  if (row.bender_lane) metadata['Bender Lane'] = row.bender_lane
  if (row.due_date) metadata['Due'] = row.due_date
  if (row.parent_id) metadata['Has Parent'] = 'yes'

  // Forward any string metadata from the card
  if (row.metadata) {
    for (const [k, v] of Object.entries(row.metadata)) {
      if (typeof v === 'string' && !metadata[k]) {
        metadata[k] = v
      }
    }
  }

  // Build description from summary + subtask progress
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
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
): Promise<NextResponse<ApiResponse<KanbanBoard> | ApiError>> {
  try {
    const { boardId } = await params
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') // 'bender' or default (standard)

    // Look up project by slug
    const { data: project, error: projError } = await tables.nexus_projects
      .select('id, slug, name')
      .eq('slug', boardId)
      .single()

    if (projError || !project) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Board '${boardId}' not found` } },
        { status: 404 }
      )
    }

    // Fetch all cards for this project
    const { data: cards, error: cardsError } = await tables.nexus_cards
      .select('*')
      .eq('project_id', (project as Record<string, unknown>).id)
      .order('created_at', { ascending: true })

    if (cardsError) throw cardsError

    const allCards = (cards ?? []) as NexusCardRow[]

    // Group cards by lane (standard or bender view)
    let lanes: KanbanLane[]
    if (view === 'bender') {
      lanes = BENDER_LANES.map(lane => ({
        name: BENDER_LANE_LABELS[lane],
        cards: allCards
          .filter(c => c.bender_lane === lane)
          .map(mapToKanbanCard),
      }))
    } else {
      lanes = STANDARD_LANES.map(lane => ({
        name: LANE_LABELS[lane],
        cards: allCards
          .filter(c => c.lane === lane)
          .map(mapToKanbanCard),
      }))
    }

    const board: KanbanBoard = {
      id: (project as Record<string, unknown>).slug as string,
      name: (project as Record<string, unknown>).name as string,
      filePath: '',
      handoff: null,
      lanes,
    }

    return NextResponse.json({ data: board, cached: false })
  } catch (error) {
    console.error('Error fetching board:', error)
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Failed to fetch board' } },
      { status: 500 }
    )
  }
}
