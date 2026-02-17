/**
 * Project Workflow Item API Route
 *
 * PATCH  /api/projects/:slug/project-workflows/:workflowId - Update a workflow
 * DELETE /api/projects/:slug/project-workflows/:workflowId - Delete a workflow
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; workflowId: string }> }
) {
  try {
    const { workflowId } = await params
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

    return NextResponse.json({ data: workflow, cached: false })
  } catch (err) {
    console.error('Project workflow PATCH error:', err)
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; workflowId: string }> }
) {
  try {
    const { workflowId } = await params

    const { error } = await tables.project_workflows
      .delete()
      .eq('id', workflowId)

    if (error) {
      return NextResponse.json({ error: { message: error.message } }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('Project workflow DELETE error:', err)
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
