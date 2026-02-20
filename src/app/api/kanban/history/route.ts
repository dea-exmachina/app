import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { KanbanCard } from '@/types/kanban'

const EXCLUDED = ['kerkoporta', 'kerkoporta-writing', 'job-search']

/**
 * GET /api/kanban/history
 *
 * Query params:
 *   ?q=keyword       — full-text search across card_id and title (DB-level ilike)
 *   ?project=slug    — filter by project slug
 *   ?lane=done       — filter by lane (defaults to 'done')
 *   ?type=task       — filter by card_type
 *   ?limit=50        — max results (capped at 200)
 *
 * Returns: { data: KanbanCard[] }
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<KanbanCard[]> | ApiError>> {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() ?? ''
    const projectFilter = searchParams.get('project') ?? ''
    // Default to 'done' lane — this endpoint is for card history
    const laneFilter = searchParams.get('lane') ?? 'done'
    const typeFilter = searchParams.get('type') ?? ''
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200)

    const { data: projects, error: projError } = await tables.nexus_projects
      .select('id, slug, name')
      .order('name')
    if (projError) throw projError

    const included = (projects ?? []).filter((p: { slug: string }) => !EXCLUDED.includes(p.slug)) as Array<{ id: string; slug: string; name: string }>
    const projectMap = new Map(included.map(p => [p.id, p.slug]))

    let query = tables.nexus_cards
      .select('id, card_id, lane, title, summary, card_type, priority, tags, completed_at, created_at, updated_at, project_id, assigned_to, ready_for_production')
      .in('project_id', included.map(p => p.id))
      .eq('lane', laneFilter)
      .order('completed_at', { ascending: false })
      .limit(limit)

    if (projectFilter) {
      const matched = included.find(p => p.slug === projectFilter)
      if (matched) query = query.eq('project_id', matched.id)
    }
    if (typeFilter) query = query.eq('card_type', typeFilter)

    // DB-level full-text search across card_id and title using ilike
    if (q) {
      query = query.or(`card_id.ilike.%${q}%,title.ilike.%${q}%`)
    }

    const { data, error } = await query
    if (error) throw error

    const result: KanbanCard[] = (data ?? []).map((c: Record<string, unknown>) => ({
      id: String(c.card_id),
      title: String(c.title),
      completed: c.lane === 'done',
      tags: Array.isArray(c.tags) ? c.tags : [],
      description: c.summary ? String(c.summary) : null,
      metadata: {
        Project: projectMap.get(String(c.project_id)) ?? '',
        ...(c.assigned_to ? { Assignee: String(c.assigned_to) } : {}),
        ...(c.card_type ? { Type: String(c.card_type) } : {}),
        ...(c.priority && c.priority !== 'normal' ? { Priority: String(c.priority) } : {}),
        ...(c.lane ? { Lane: String(c.lane) } : {}),
      },
      rawMarkdown: '',
      startedAt: null,
      completedAt: c.completed_at ? String(c.completed_at) : null,
      createdAt: String(c.created_at),
      readyForProduction: Boolean(c.ready_for_production),
      projectId: c.project_id ? String(c.project_id) : null,
    }))

    return NextResponse.json({ data: result, cached: false })
  } catch (err) {
    console.error('GET /api/kanban/history error:', err)
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Failed to search cards' } },
      { status: 500 }
    )
  }
}
