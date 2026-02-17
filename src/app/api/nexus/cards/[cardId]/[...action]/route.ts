/**
 * NEXUS Cards Catch-All Sub-Route
 *
 * Consolidates all sub-routes under /api/nexus/cards/[cardId]/:
 *
 * GET    /api/nexus/cards/[cardId]/comments         — list comments
 * POST   /api/nexus/cards/[cardId]/comments         — create comment
 * PATCH  /api/nexus/cards/[cardId]/comments/[id]    — resolve or edit comment
 * DELETE /api/nexus/cards/[cardId]/comments/[id]    — delete comment
 * GET    /api/nexus/cards/[cardId]/context           — get context package
 * POST   /api/nexus/cards/[cardId]/context           — assemble context package
 * GET    /api/nexus/cards/[cardId]/details           — get task details
 * PUT    /api/nexus/cards/[cardId]/details           — create or update task details
 * GET    /api/nexus/cards/[cardId]/events            — list audit events
 *
 * DEA-042 | Consolidated catch-all
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type {
  NexusCard,
  NexusComment,
  NexusCommentCreate,
  NexusContextPackage,
  NexusTaskDetails,
  NexusTaskDetailsCreate,
  NexusTaskDetailsUpdate,
  ContextLayers,
} from '@/types/nexus'
import type { AuditCategory } from '@/types/audit'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function resolveCardUuid(cardId: string): Promise<string | null> {
  const { data } = await tables.nexus_cards
    .select('id')
    .eq('card_id', cardId)
    .single()
  return data?.id ?? null
}

async function resolveCard(cardId: string): Promise<NexusCard | null> {
  const { data } = await tables.nexus_cards
    .select('*')
    .eq('card_id', cardId)
    .single()
  return data as NexusCard | null
}

// ---------------------------------------------------------------------------
// Comments handlers
// ---------------------------------------------------------------------------

async function getComments(
  request: NextRequest,
  cardId: string
): Promise<NextResponse> {
  const uuid = await resolveCardUuid(cardId)
  if (!uuid) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Card not found: ${cardId}` } },
      { status: 404 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const pivotsOnly = searchParams.get('pivots_only') === 'true'
  const unresolvedOnly = searchParams.get('unresolved_only') === 'true'

  let query = tables.nexus_comments
    .select('*')
    .eq('card_id', uuid)
    .order('created_at', { ascending: true })

  if (pivotsOnly) query = query.eq('is_pivot', true)
  if (unresolvedOnly) query = query.eq('resolved', false)

  const { data, error } = await query
  if (error) {
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data, cached: false })
}

async function createComment(
  request: NextRequest,
  cardId: string
): Promise<NextResponse> {
  const uuid = await resolveCardUuid(cardId)
  if (!uuid) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Card not found: ${cardId}` } },
      { status: 404 }
    )
  }

  const body: Omit<NexusCommentCreate, 'card_id'> = await request.json()

  if (!body.author || !body.content) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'author and content are required' } },
      { status: 400 }
    )
  }

  // Validate author: dea, user, webapp, github-actions, bender, or bender+{slug}
  const validAuthor =
    ['dea', 'user', 'bender', 'webapp', 'github-actions'].includes(body.author) ||
    /^bender\+[a-z0-9-]+$/.test(body.author)
  if (!validAuthor) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid author. Must be dea, user, webapp, bender, or bender+{slug}',
        },
      },
      { status: 400 }
    )
  }

  const { data, error } = await tables.nexus_comments
    .insert({ ...body, card_id: uuid })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: { code: 'CREATE_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  // comment event emitted by database trigger
  return NextResponse.json({ data, cached: false }, { status: 201 })
}

async function patchComment(
  request: NextRequest,
  cardId: string,
  commentId: string
): Promise<NextResponse> {
  const uuid = await resolveCardUuid(cardId)
  if (!uuid) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Card not found: ${cardId}` } },
      { status: 404 }
    )
  }

  const body = await request.json()

  // Resolve action
  if (body.resolved === true) {
    const { data, error } = await tables.nexus_comments
      .update({
        resolved: true,
        resolved_by: 'user',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .eq('card_id', uuid)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'UPDATE_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Comment not found: ${commentId}` } },
        { status: 404 }
      )
    }

    return NextResponse.json({ data, cached: false })
  }

  // Edit action — only user-authored comments
  if (body.content !== undefined) {
    const { data: existing } = await tables.nexus_comments
      .select('author')
      .eq('id', commentId)
      .eq('card_id', uuid)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Comment not found: ${commentId}` } },
        { status: 404 }
      )
    }

    if (existing.author !== 'user') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Can only edit your own comments' } },
        { status: 403 }
      )
    }

    const updateFields: Record<string, unknown> = { content: body.content }
    if (body.comment_type) updateFields.comment_type = body.comment_type

    const { data, error } = await tables.nexus_comments
      .update(updateFields)
      .eq('id', commentId)
      .eq('card_id', uuid)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'UPDATE_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, cached: false })
  }

  return NextResponse.json(
    { error: { code: 'VALIDATION_ERROR', message: 'Provide { resolved: true } or { content: "..." }' } },
    { status: 400 }
  )
}

async function deleteComment(
  cardId: string,
  commentId: string
): Promise<NextResponse> {
  const uuid = await resolveCardUuid(cardId)
  if (!uuid) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Card not found: ${cardId}` } },
      { status: 404 }
    )
  }

  const { data: existing } = await tables.nexus_comments
    .select('author')
    .eq('id', commentId)
    .eq('card_id', uuid)
    .single()

  if (!existing) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Comment not found: ${commentId}` } },
      { status: 404 }
    )
  }

  if (existing.author !== 'user') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Can only delete your own comments' } },
      { status: 403 }
    )
  }

  const { error } = await tables.nexus_comments
    .delete()
    .eq('id', commentId)
    .eq('card_id', uuid)

  if (error) {
    return NextResponse.json(
      { error: { code: 'DELETE_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true }, { status: 200 })
}

// ---------------------------------------------------------------------------
// Context handlers
// ---------------------------------------------------------------------------

async function getContext(
  request: NextRequest,
  cardId: string
): Promise<NextResponse> {
  const layer = parseInt(request.nextUrl.searchParams.get('layer') ?? '0', 10)

  if (![0, 1, 2].includes(layer)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'layer must be 0, 1, or 2' } },
      { status: 400 }
    )
  }

  const card = await resolveCard(cardId)
  if (!card) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Card not found: ${cardId}` } },
      { status: 404 }
    )
  }

  // Layer 0: card only
  if (layer === 0) {
    return NextResponse.json({ data: { card }, layer: 0, cached: false })
  }

  // Layer 1: card + details + comments
  const [detailsResult, commentsResult] = await Promise.all([
    tables.nexus_task_details
      .select('*')
      .eq('card_id', card.id)
      .maybeSingle(),
    tables.nexus_comments
      .select('*')
      .eq('card_id', card.id)
      .order('created_at', { ascending: true }),
  ])

  const details = (detailsResult.data as NexusTaskDetails | null) ?? null
  const comments = (commentsResult.data as NexusComment[] | null) ?? []

  if (layer === 1) {
    return NextResponse.json({ data: { card, details, comments }, layer: 1, cached: false })
  }

  // Layer 2: card + details + comments + context package + children
  const [contextResult, childrenResult] = await Promise.all([
    tables.nexus_context_packages
      .select('*')
      .eq('card_id', card.id)
      .eq('stale', false)
      .order('assembled_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    tables.nexus_cards
      .select('*')
      .eq('parent_id', card.id)
      .order('created_at', { ascending: true }),
  ])

  const context = (contextResult.data as NexusContextPackage | null) ?? null
  const children = (childrenResult.data as NexusCard[] | null) ?? []

  return NextResponse.json({
    data: { card, details, comments, context, children },
    layer: 2,
    cached: false,
  })
}

async function assembleContext(
  _request: NextRequest,
  cardId: string
): Promise<NextResponse> {
  const card = await resolveCard(cardId)
  if (!card) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Card not found: ${cardId}` } },
      { status: 404 }
    )
  }

  // Gather all context data
  const [detailsResult, commentsResult, childrenResult, projectResult] = await Promise.all([
    tables.nexus_task_details
      .select('*')
      .eq('card_id', card.id)
      .maybeSingle(),
    tables.nexus_comments
      .select('*')
      .eq('card_id', card.id)
      .order('created_at', { ascending: true }),
    tables.nexus_cards
      .select('card_id, title, lane, card_type, assigned_to')
      .eq('parent_id', card.id)
      .order('created_at', { ascending: true }),
    card.project_id
      ? tables.nexus_projects.select('slug, name, delegation_policy').eq('id', card.project_id).single()
      : Promise.resolve({ data: null }),
  ])

  const details = detailsResult.data as NexusTaskDetails | null
  const comments = (commentsResult.data ?? []) as NexusComment[]
  const children = (childrenResult.data ?? []) as NexusCard[]

  // Build layers
  const layers: ContextLayers = {
    base: [
      `Card: ${card.card_id} — ${card.title}`,
      `Type: ${card.card_type} | Lane: ${card.lane} | Priority: ${card.priority}`,
      card.assigned_to ? `Assigned: ${card.assigned_to}` : 'Unassigned',
      card.bender_lane ? `Bender lane: ${card.bender_lane}` : '',
    ].filter(Boolean),
    task_type: details
      ? [
          details.overview ?? '',
          details.requirements ? `Requirements: ${details.requirements}` : '',
          details.acceptance_criteria ? `Criteria: ${details.acceptance_criteria}` : '',
          details.constraints ? `Constraints: ${details.constraints}` : '',
          details.deliverables ? `Deliverables: ${details.deliverables}` : '',
        ].filter(Boolean)
      : [],
    project: projectResult.data
      ? [
          `Project: ${(projectResult.data as Record<string, string>).name} (${(projectResult.data as Record<string, string>).slug})`,
          `Policy: ${(projectResult.data as Record<string, string>).delegation_policy}`,
        ]
      : [],
    comments: comments.map(
      (c) => `[${c.comment_type}${c.is_pivot ? '/pivot' : ''}] ${c.author}: ${c.content}`
    ),
  }

  // Build assembled files from declared scope
  const assembledFiles = details?.declared_scope ?? []

  // Build assembled content summary
  const assembledContent = [
    ...layers.base ?? [],
    '',
    ...(layers.task_type?.length ? ['--- Task Details ---', ...layers.task_type, ''] : []),
    ...(layers.project?.length ? ['--- Project ---', ...layers.project, ''] : []),
    ...(children.length
      ? [
          '--- Subtasks ---',
          ...children.map((c: NexusCard) => `  ${c.card_id}: ${c.title} [${c.lane}]`),
          '',
        ]
      : []),
    ...(layers.comments?.length ? ['--- Comments ---', ...layers.comments] : []),
  ].join('\n')

  // Mark old packages as stale
  await tables.nexus_context_packages
    .update({ stale: true })
    .eq('card_id', card.id)
    .eq('stale', false)

  // Insert new context package
  const { data: pkg, error } = await tables.nexus_context_packages
    .insert({
      card_id: card.id,
      layers,
      assembled_files: assembledFiles,
      assembled_content: assembledContent,
      assembled_at: new Date().toISOString(),
      stale: false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: { code: 'CREATE_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: pkg, cached: false }, { status: 201 })
}

// ---------------------------------------------------------------------------
// Details handlers
// ---------------------------------------------------------------------------

async function getDetails(cardId: string): Promise<NextResponse> {
  const uuid = await resolveCardUuid(cardId)
  if (!uuid) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Card not found: ${cardId}` } },
      { status: 404 }
    )
  }

  const { data, error } = await tables.nexus_task_details
    .select('*')
    .eq('card_id', uuid)
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  if (!data) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `No task details for card: ${cardId}` } },
      { status: 404 }
    )
  }

  return NextResponse.json({ data, cached: false })
}

async function putDetails(
  request: NextRequest,
  cardId: string
): Promise<NextResponse> {
  const uuid = await resolveCardUuid(cardId)
  if (!uuid) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Card not found: ${cardId}` } },
      { status: 404 }
    )
  }

  const body: NexusTaskDetailsCreate & NexusTaskDetailsUpdate = await request.json()

  // Check if details already exist
  const { data: existing } = await tables.nexus_task_details
    .select('id')
    .eq('card_id', uuid)
    .maybeSingle()

  if (existing) {
    // Update
    const { card_id: _ignored, ...updateFields } = body
    const { data, error } = await tables.nexus_task_details
      .update(updateFields)
      .eq('card_id', uuid)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'UPDATE_ERROR', message: error.message } },
        { status: 500 }
      )
    }
    return NextResponse.json({ data, cached: false })
  } else {
    // Create
    const { data, error } = await tables.nexus_task_details
      .insert({ ...body, card_id: uuid })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'CREATE_ERROR', message: error.message } },
        { status: 500 }
      )
    }
    return NextResponse.json({ data, cached: false }, { status: 201 })
  }
}

// ---------------------------------------------------------------------------
// Events handler
// ---------------------------------------------------------------------------

const MAX_LIMIT = 200
const DEFAULT_LIMIT = 50

async function getEvents(
  request: NextRequest,
  cardId: string
): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category') as AuditCategory | null
  const action = searchParams.get('action')
  const since = searchParams.get('since')
  const limit = Math.min(
    parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10),
    MAX_LIMIT
  )

  // audit_log uses card display ID directly (denormalized) — no UUID lookup needed
  let query = tables.audit_log
    .select('*')
    .eq('card_id', cardId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (category) query = query.eq('category', category)
  if (action) query = query.eq('action', action)
  if (since) query = query.gte('created_at', since)

  const { data, error } = await query
  if (error) {
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data, total: data?.length ?? 0 })
}

// ---------------------------------------------------------------------------
// Route exports — dispatch by action[0] and method
// ---------------------------------------------------------------------------

type RouteParams = { params: Promise<{ cardId: string; action: string[] }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { cardId, action } = await params
    const resource = action[0]

    if (resource === 'comments') return getComments(request, cardId)
    if (resource === 'context') return getContext(request, cardId)
    if (resource === 'details') return getDetails(cardId)
    if (resource === 'events') return getEvents(request, cardId)

    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Unknown resource: ${resource}` } },
      { status: 404 }
    )
  } catch (error) {
    console.error('GET /api/nexus/cards/[cardId]/[...action] error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { cardId, action } = await params
    const resource = action[0]

    if (resource === 'comments') return createComment(request, cardId)
    if (resource === 'context') return assembleContext(request, cardId)

    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Unknown resource: ${resource}` } },
      { status: 404 }
    )
  } catch (error) {
    console.error('POST /api/nexus/cards/[cardId]/[...action] error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { cardId, action } = await params
    const resource = action[0]
    const commentId = action[1]

    if (resource === 'comments' && commentId) {
      return patchComment(request, cardId, commentId)
    }

    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Unknown resource or missing ID: ${action.join('/')}` } },
      { status: 404 }
    )
  } catch (error) {
    console.error('PATCH /api/nexus/cards/[cardId]/[...action] error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { cardId, action } = await params
    const resource = action[0]

    if (resource === 'details') return putDetails(request, cardId)

    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Unknown resource: ${resource}` } },
      { status: 404 }
    )
  } catch (error) {
    console.error('PUT /api/nexus/cards/[cardId]/[...action] error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { cardId, action } = await params
    const resource = action[0]
    const commentId = action[1]

    if (resource === 'comments' && commentId) {
      return deleteComment(cardId, commentId)
    }

    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Unknown resource or missing ID: ${action.join('/')}` } },
      { status: 404 }
    )
  } catch (error) {
    console.error('DELETE /api/nexus/cards/[cardId]/[...action] error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
