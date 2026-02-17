/**
 * Tech Stack API Route
 *
 * GET  /api/projects/:slug/tech-stack - List tech stack items for a project
 * POST /api/projects/:slug/tech-stack - Add a tech stack item
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

    const { data, error } = await tables.project_tech_stack
      .select('*')
      .eq('project_id', projectId)
      .order('category')
      .order('name')

    if (error) {
      return NextResponse.json({ error: { message: error.message } }, { status: 500 })
    }

    const items = (data ?? []).map((row: Record<string, unknown>) => ({
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
    }))

    return NextResponse.json({ data: items, cached: false })
  } catch (err) {
    console.error('Tech stack GET error:', err)
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

    const item = {
      id: data.id,
      projectId: data.project_id,
      name: data.name,
      version: data.version,
      category: data.category,
      role: data.role,
      url: data.url,
      notes: data.notes,
      metadata: data.metadata ?? {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }

    return NextResponse.json({ data: item, cached: false }, { status: 201 })
  } catch (err) {
    console.error('Tech stack POST error:', err)
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
