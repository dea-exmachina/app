import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { KanbanCard } from '@/types/kanban'

const EXCLUDED = ['kerkoporta', 'kerkoporta-writing', 'job-search']

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<KanbanCard[]> | ApiError>> {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() ?? ''
    const projectFilter = searchParams.get('project') ?? ''
    const laneFilter = searchParams.get('lane') ?? ''
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
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (projectFilter) {
      const matched = included.find(p => p.slug === projectFilter)
      if (matched) query = query.eq('project_id', matched.id)
    }
    if (laneFilter) query = query.eq('lane', laneFilter)
    if (typeFilter) query = query.eq('card_type', typeFilter)

    const { data, error } = await query
    if (error) throw error

    let cards = (data ?? []) as Array<Record<string, unknown>>

    if (q) {
      const lower = q.toLowerCase()
      cards = cards.filter(c =>
        String(c.card_id ?? '').toLowerCase().includes(lower) ||
        String(c.title ?? '').toLowerCase().includes(lower) ||
        String(c.summary ?? '').toLowerCase().includes(lower) ||
        (Array.isArray(c.tags) && c.tags.some((t: string) => t.toLowerCase().includes(lower)))
      )
    }

    const result: KanbanCard[] = cards.map(c => ({
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
