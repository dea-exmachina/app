import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { KanbanBoard, KanbanCard, KanbanLane } from '@/types/kanban'

/**
 * GET /api/kanban/unified — Unified board scoped to dev/engineering projects
 *
 * Query params:
 *   ?project=<slug>  — filter to a single project (omit for all)
 *   ?done_after=<iso> — filter Done lane by completed_at >= date
 *   ?done_before=<iso> — filter Done lane by completed_at <= date
 *
 * Content pipeline projects are excluded by default (see EXCLUDED_PROJECT_SLUGS).
 * To add/remove exclusions, update the constant below.
 */

/**
 * Projects excluded from the unified kanban board.
 * These are content pipeline projects — not dev/engineering work.
 * Add slugs here to exclude additional projects from the board view.
 */
const EXCLUDED_PROJECT_SLUGS: readonly string[] = [
  'kerkoporta',
  'kerkoporta-writing',
  'job-search',
]

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
  parent: { card_id: string } | { card_id: string }[] | null
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

  // Extract parent card_id from the join
  const parentCardId = Array.isArray(row.parent)
    ? row.parent[0]?.card_id ?? null
    : row.parent?.card_id ?? null

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
    parentCardId,
  }
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<KanbanBoard> | ApiError>> {
  try {
    const { searchParams } = new URL(request.url)
    const projectFilter = searchParams.get('project')
    // Date filter applies only to the Done lane (filter by completed_at)
    const doneAfter = searchParams.get('done_after')
    const doneBefore = searchParams.get('done_before')

    // Fetch all projects for slug lookup
    const { data: projects, error: projError } = await tables.nexus_projects
      .select('id, slug, name')
      .order('name')

    if (projError) throw projError

    const allProjects = (projects ?? []) as Array<{ id: string; slug: string; name: string }>

    // Exclude content pipeline projects from the board
    const includedProjects = allProjects.filter(
      p => !EXCLUDED_PROJECT_SLUGS.includes(p.slug)
    )
    const includedProjectIds = includedProjects.map(p => p.id)

    const projectMap = new Map(includedProjects.map(p => [p.id, p.slug]))

    // Build base card query (active lanes — no date filter) with parent join
    let activeQuery = tables.nexus_cards
      .select('*, parent:parent_id(card_id)')
      .in('lane', ['backlog', 'ready', 'in_progress', 'review'])
      .in('project_id', includedProjectIds)
      .order('created_at', { ascending: true })

    // Build done lane query with optional date filter on completed_at + parent join
    let doneQuery = tables.nexus_cards
      .select('*, parent:parent_id(card_id)')
      .eq('lane', 'done')
      .in('project_id', includedProjectIds)
      .order('completed_at', { ascending: true })

    if (doneAfter) doneQuery = doneQuery.gte('completed_at', doneAfter)
    if (doneBefore) doneQuery = doneQuery.lte('completed_at', doneBefore)

    // Filter by project slug if provided (must be an included project)
    if (projectFilter) {
      const matchedProject = includedProjects.find(p => p.slug === projectFilter)
      if (matchedProject) {
        activeQuery = activeQuery.eq('project_id', matchedProject.id)
        doneQuery = doneQuery.eq('project_id', matchedProject.id)
      }
    }

    const [activeResult, doneResult] = await Promise.all([activeQuery, doneQuery])

    if (activeResult.error) throw activeResult.error
    if (doneResult.error) throw doneResult.error

    const activeCards = (activeResult.data ?? []) as NexusCardRow[]
    const doneCards = (doneResult.data ?? []) as NexusCardRow[]
    const allCards = [...activeCards, ...doneCards]

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
