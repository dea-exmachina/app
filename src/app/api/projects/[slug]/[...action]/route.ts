/**
 * Project Sub-Resource Catch-All API Route
 *
 * Handles all sub-routes under /api/projects/:slug/:action
 *
 * GET    /api/projects/:slug/dashboard
 * PATCH  /api/projects/:slug/links
 * PATCH  /api/projects/:slug/notes
 * GET    /api/projects/:slug/project-workflows
 * POST   /api/projects/:slug/project-workflows
 * PATCH  /api/projects/:slug/project-workflows/:workflowId
 * DELETE /api/projects/:slug/project-workflows/:workflowId
 * GET    /api/projects/:slug/tech-stack
 * POST   /api/projects/:slug/tech-stack
 * PATCH  /api/projects/:slug/tech-stack/:itemId
 * DELETE /api/projects/:slug/tech-stack/:itemId
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ProjectDashboardData, ProjectNotes, ProjectLink } from '@/types/project'
import type { NexusCard, NexusProject } from '@/types/nexus'
import type { ErrorResponse } from '@/types/project'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const DEFAULT_NOTES: ProjectNotes = { checklist: [], freeform: '' }

function resolveColumn(slug: string): 'id' | 'slug' {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
    ? 'id'
    : 'slug'
}

async function resolveProjectId(slug: string): Promise<string | null> {
  const column = resolveColumn(slug)
  const { data } = await tables.projects.select('id').eq(column, slug).single()
  return data?.id ?? null
}

// ---------------------------------------------------------------------------
// Dashboard handler
// ---------------------------------------------------------------------------

async function handleDashboardGet(
  slug: string
): Promise<NextResponse<{ data: ProjectDashboardData; cached: boolean } | ErrorResponse>> {
  const column = resolveColumn(slug)

  const { data: project, error: projectError } = await tables.projects
    .select('*')
    .eq(column, slug)
    .single()

  if (projectError) {
    if (projectError.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Project not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch project', details: projectError.message, code: 'DB_ERROR' },
      { status: 500 }
    )
  }

  let template = null
  if (project.template_id) {
    const { data: templateData } = await tables.project_templates
      .select('*')
      .eq('id', project.template_id)
      .single()
    template = templateData
  }

  const { data: nexusProject } = await tables.nexus_projects
    .select('*')
    .eq('slug', project.slug)
    .maybeSingle() as { data: NexusProject | null }

  let cardsByLane: Record<string, number> = {}
  let totalCards = 0
  let completionPct = 0
  let openCards: NexusCard[] = []
  let lastCardActivity: string | null = null

  if (nexusProject) {
    const { data: allCards } = await tables.nexus_cards
      .select('lane')
      .eq('project_id', nexusProject.id) as { data: Array<{ lane: string }> | null }

    if (allCards) {
      for (const card of allCards) {
        cardsByLane[card.lane] = (cardsByLane[card.lane] || 0) + 1
        totalCards++
      }
    }

    const doneCount = cardsByLane['done'] || 0
    completionPct = totalCards > 0 ? Math.round((doneCount / totalCards) * 100) : 0

    const { data: openCardsData } = await tables.nexus_cards
      .select('*')
      .eq('project_id', nexusProject.id)
      .neq('lane', 'done')
      .order('created_at', { ascending: false })
      .limit(50) as { data: NexusCard[] | null }

    if (openCardsData) {
      const priorityOrder: Record<string, number> = {
        critical: 0, high: 1, normal: 2, low: 3,
      }
      openCards = openCardsData.sort(
        (a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
      )
    }

    const { data: latestCard } = await tables.nexus_cards
      .select('updated_at')
      .eq('project_id', nexusProject.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (latestCard) {
      lastCardActivity = (latestCard as { updated_at: string }).updated_at
    }
  }

  const { data: projectBenders } = await tables.project_benders
    .select('identity_id, role, status')
    .eq('project_id', project.id) as {
      data: Array<{ identity_id: string; role: string | null; status: string | null }> | null
    }

  const teamMembers = []
  if (projectBenders && projectBenders.length > 0) {
    const identityIds = projectBenders.map((pb) => pb.identity_id)
    const { data: identities } = await tables.bender_identities
      .select('id, slug, display_name, expertise')
      .in('id', identityIds) as {
        data: Array<{
          id: string; slug: string; display_name: string; expertise: string[]
        }> | null
      }

    if (identities) {
      for (const pb of projectBenders) {
        const identity = identities.find((i) => i.id === pb.identity_id)
        if (identity) {
          teamMembers.push({
            identity_id: identity.id,
            slug: identity.slug,
            display_name: identity.display_name,
            role: pb.role,
            status: pb.status,
            expertise: identity.expertise || [],
          })
        }
      }
    }
  }

  const settings = (project.settings || {}) as Record<string, unknown>
  const notes: ProjectNotes = (settings.notes as ProjectNotes) || DEFAULT_NOTES
  const links: ProjectLink[] = (settings.links as ProjectLink[]) || []

  const dashboardData: ProjectDashboardData = {
    project,
    template,
    nexusProject,
    cardsByLane,
    totalCards,
    completionPct,
    openCards,
    teamMembers,
    notes,
    links,
    lastCardActivity,
    benderCount: projectBenders?.length || 0,
  }

  return NextResponse.json({ data: dashboardData, cached: false })
}

// ---------------------------------------------------------------------------
// Links handler
// ---------------------------------------------------------------------------

async function handleLinksPatch(
  request: NextRequest,
  slug: string
): Promise<NextResponse<{ data: ProjectLink[]; cached: boolean } | ErrorResponse>> {
  const body = await request.json() as { items: ProjectLink[] }

  if (!Array.isArray(body.items)) {
    return NextResponse.json(
      { error: 'items must be an array', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const column = resolveColumn(slug)

  const { data: project, error: fetchError } = await tables.projects
    .select('id, settings')
    .eq(column, slug)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Project not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch project', details: fetchError.message, code: 'DB_ERROR' },
      { status: 500 }
    )
  }

  const currentSettings = (project.settings || {}) as Record<string, unknown>
  const updatedSettings = { ...currentSettings, links: body.items }

  const { error: updateError } = await tables.projects
    .update({ settings: JSON.parse(JSON.stringify(updatedSettings)) })
    .eq('id', project.id)

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to update links', details: updateError.message, code: 'DB_ERROR' },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: body.items, cached: false })
}

// ---------------------------------------------------------------------------
// Notes handler
// ---------------------------------------------------------------------------

async function handleNotesPatch(
  request: NextRequest,
  slug: string
): Promise<NextResponse<{ data: ProjectNotes; cached: boolean } | ErrorResponse>> {
  const body = await request.json() as Partial<ProjectNotes>

  const column = resolveColumn(slug)

  const { data: project, error: fetchError } = await tables.projects
    .select('id, settings')
    .eq(column, slug)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Project not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch project', details: fetchError.message, code: 'DB_ERROR' },
      { status: 500 }
    )
  }

  const currentSettings = (project.settings || {}) as Record<string, unknown>
  const currentNotes = (currentSettings.notes || { checklist: [], freeform: '' }) as ProjectNotes

  const updatedNotes: ProjectNotes = {
    checklist: body.checklist !== undefined ? body.checklist : currentNotes.checklist,
    freeform: body.freeform !== undefined ? body.freeform : currentNotes.freeform,
  }

  const updatedSettings = { ...currentSettings, notes: updatedNotes }

  const { error: updateError } = await tables.projects
    .update({ settings: JSON.parse(JSON.stringify(updatedSettings)) })
    .eq('id', project.id)

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to update notes', details: updateError.message, code: 'DB_ERROR' },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: updatedNotes, cached: false })
}

// ---------------------------------------------------------------------------
// Project-workflows handlers
// ---------------------------------------------------------------------------

function mapWorkflowRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description,
    workflowPath: row.workflow_path,
    triggerEvent: row.trigger_event,
    automated: row.automated ?? false,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function handleWorkflowsGet(slug: string) {
  const projectId = await resolveProjectId(slug)
  if (!projectId) {
    return NextResponse.json({ error: { message: 'Project not found' } }, { status: 404 })
  }

  const { data, error } = await tables.project_workflows
    .select('*')
    .eq('project_id', projectId)
    .order('name')

  if (error) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500 })
  }

  const workflows = (data ?? []).map((row: Record<string, unknown>) => mapWorkflowRow(row))
  return NextResponse.json({ data: workflows, cached: false })
}

async function handleWorkflowsPost(request: NextRequest, slug: string) {
  const projectId = await resolveProjectId(slug)
  if (!projectId) {
    return NextResponse.json({ error: { message: 'Project not found' } }, { status: 404 })
  }

  const body = await request.json()
  const { name, description, workflowPath, triggerEvent, automated, metadata } = body

  if (!name) {
    return NextResponse.json({ error: { message: 'name is required' } }, { status: 400 })
  }

  const { data, error } = await tables.project_workflows
    .insert({
      project_id: projectId,
      name,
      description: description ?? null,
      workflow_path: workflowPath ?? null,
      trigger_event: triggerEvent ?? null,
      automated: automated ?? false,
      metadata: metadata ?? {},
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500 })
  }

  return NextResponse.json({ data: mapWorkflowRow(data as Record<string, unknown>), cached: false }, { status: 201 })
}

async function handleWorkflowPatch(request: NextRequest, workflowId: string) {
  const body = await request.json()

  const fieldMap: Record<string, string> = {
    name: 'name',
    description: 'description',
    workflowPath: 'workflow_path',
    triggerEvent: 'trigger_event',
    automated: 'automated',
    metadata: 'metadata',
  }

  const updates: Record<string, unknown> = {}
  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (body[camel] !== undefined) {
      updates[snake] = body[camel]
    }
  }
  updates.updated_at = new Date().toISOString()

  const { data, error } = await tables.project_workflows
    .update(updates)
    .eq('id', workflowId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: { message: 'Workflow not found' } }, { status: 404 })
    }
    return NextResponse.json({ error: { message: error.message } }, { status: 500 })
  }

  return NextResponse.json({ data: mapWorkflowRow(data as Record<string, unknown>), cached: false })
}

async function handleWorkflowDelete(workflowId: string) {
  const { error } = await tables.project_workflows
    .delete()
    .eq('id', workflowId)

  if (error) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}

// ---------------------------------------------------------------------------
// Tech-stack handlers
// ---------------------------------------------------------------------------

function mapTechStackRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    version: row.version,
    category: row.category,
    role: row.role,
    url: row.url,
    notes: row.notes,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function handleTechStackGet(slug: string) {
  const projectId = await resolveProjectId(slug)
  if (!projectId) {
    return NextResponse.json({ error: { message: 'Project not found' } }, { status: 404 })
  }

  const { data, error } = await tables.project_tech_stack
    .select('*')
    .eq('project_id', projectId)
    .order('category')
    .order('name')

  if (error) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500 })
  }

  const items = (data ?? []).map((row: Record<string, unknown>) => mapTechStackRow(row))
  return NextResponse.json({ data: items, cached: false })
}

async function handleTechStackPost(request: NextRequest, slug: string) {
  const projectId = await resolveProjectId(slug)
  if (!projectId) {
    return NextResponse.json({ error: { message: 'Project not found' } }, { status: 404 })
  }

  const body = await request.json()
  const { name, version, category, role, url, notes, metadata } = body

  if (!name || !category) {
    return NextResponse.json({ error: { message: 'name and category are required' } }, { status: 400 })
  }

  const { data, error } = await tables.project_tech_stack
    .insert({
      project_id: projectId,
      name,
      version: version ?? null,
      category,
      role: role ?? null,
      url: url ?? null,
      notes: notes ?? null,
      metadata: metadata ?? {},
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500 })
  }

  return NextResponse.json({ data: mapTechStackRow(data as Record<string, unknown>), cached: false }, { status: 201 })
}

async function handleTechStackItemPatch(request: NextRequest, itemId: string) {
  const body = await request.json()

  const updates: Record<string, unknown> = {}
  for (const key of ['name', 'version', 'category', 'role', 'url', 'notes', 'metadata']) {
    if (body[key] !== undefined) {
      updates[key] = body[key]
    }
  }
  updates.updated_at = new Date().toISOString()

  const { data, error } = await tables.project_tech_stack
    .update(updates)
    .eq('id', itemId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: { message: 'Item not found' } }, { status: 404 })
    }
    return NextResponse.json({ error: { message: error.message } }, { status: 500 })
  }

  return NextResponse.json({ data: mapTechStackRow(data as Record<string, unknown>), cached: false })
}

async function handleTechStackItemDelete(itemId: string) {
  const { error } = await tables.project_tech_stack
    .delete()
    .eq('id', itemId)

  if (error) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}

// ---------------------------------------------------------------------------
// Catch-all dispatcher
// ---------------------------------------------------------------------------

type RouteContext = {
  params: Promise<{ slug: string; action: string[] }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { slug, action } = await params
    const resource = action[0]

    if (resource === 'dashboard') {
      return handleDashboardGet(slug)
    }
    if (resource === 'project-workflows') {
      return handleWorkflowsGet(slug)
    }
    if (resource === 'tech-stack') {
      return handleTechStackGet(slug)
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (err) {
    console.error('Project sub-resource GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { slug, action } = await params
    const resource = action[0]

    if (resource === 'project-workflows') {
      return handleWorkflowsPost(request, slug)
    }
    if (resource === 'tech-stack') {
      return handleTechStackPost(request, slug)
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (err) {
    console.error('Project sub-resource POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { slug, action } = await params
    const resource = action[0]
    const itemId = action[1]

    if (resource === 'links') {
      return handleLinksPatch(request, slug)
    }
    if (resource === 'notes') {
      return handleNotesPatch(request, slug)
    }
    if (resource === 'project-workflows' && itemId) {
      return handleWorkflowPatch(request, itemId)
    }
    if (resource === 'tech-stack' && itemId) {
      return handleTechStackItemPatch(request, itemId)
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (err) {
    console.error('Project sub-resource PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { slug, action } = await params
    const resource = action[0]
    const itemId = action[1]

    if (resource === 'project-workflows' && itemId) {
      return handleWorkflowDelete(itemId)
    }
    if (resource === 'tech-stack' && itemId) {
      return handleTechStackItemDelete(itemId)
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (err) {
    console.error('Project sub-resource DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
