/**
 * NEXUS Context API — Progressive Disclosure Layers
 *
 * GET /api/nexus/cards/[cardId]/context?layer=0|1|2
 *   - Layer 0: Card index only (lightweight)
 *   - Layer 1: Card + task details + comments (on demand)
 *   - Layer 2: Full context package + children (for execution)
 *
 * POST /api/nexus/cards/[cardId]/context
 *   - Assemble and store a context package for the card
 *
 * DEA-042 | Phase 3a — Context Engine
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { NexusCard, NexusTaskDetails, NexusComment, NexusContextPackage, ContextLayers } from '@/types/nexus'

async function resolveCard(cardId: string): Promise<NexusCard | null> {
  const { data } = await tables.nexus_cards
    .select('*')
    .eq('card_id', cardId)
    .single()
  return data as NexusCard | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params
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
  } catch (error) {
    console.error('GET /api/nexus/cards/[cardId]/context error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get card context' } },
      { status: 500 }
    )
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params
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
      task_type: details ? [
        details.overview ?? '',
        details.requirements ? `Requirements: ${details.requirements}` : '',
        details.acceptance_criteria ? `Criteria: ${details.acceptance_criteria}` : '',
        details.constraints ? `Constraints: ${details.constraints}` : '',
        details.deliverables ? `Deliverables: ${details.deliverables}` : '',
      ].filter(Boolean) : [],
      project: projectResult.data ? [
        `Project: ${(projectResult.data as Record<string, string>).name} (${(projectResult.data as Record<string, string>).slug})`,
        `Policy: ${(projectResult.data as Record<string, string>).delegation_policy}`,
      ] : [],
      comments: comments.map(c =>
        `[${c.comment_type}${c.is_pivot ? '/pivot' : ''}] ${c.author}: ${c.content}`
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
      ...(children.length ? [
        '--- Subtasks ---',
        ...children.map((c: NexusCard) => `  ${c.card_id}: ${c.title} [${c.lane}]`),
        '',
      ] : []),
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
  } catch (error) {
    console.error('POST /api/nexus/cards/[cardId]/context error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to assemble context' } },
      { status: 500 }
    )
  }
}
