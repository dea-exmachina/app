/**
 * Project Workflows API Route
 *
 * GET  /api/projects/:slug/project-workflows - List workflows for a project
 * POST /api/projects/:slug/project-workflows - Add a workflow
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

async function resolveProjectId(slug: string): Promise<string | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
  const column = isUuid ? 'id' : 'slug'
  const { data } = await tables.projects.select('id').eq(column, slug).single()
  return data?.id ?? null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
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

    const workflows = (data ?? []).map((row: Record<string, unknown>) => ({
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
    }))

    return NextResponse.json({ data: workflows, cached: false })
  } catch (err) {
    console.error('Project workflows GET error:', err)
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
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

    const workflow = {
      id: data.id,
      projectId: data.project_id,
      name: data.name,
      description: data.description,
      workflowPath: data.workflow_path,
      triggerEvent: data.trigger_event,
      automated: data.automated ?? false,
      metadata: data.metadata ?? {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }

    return NextResponse.json({ data: workflow, cached: false }, { status: 201 })
  } catch (err) {
    console.error('Project workflows POST error:', err)
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
