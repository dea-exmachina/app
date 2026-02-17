/**
 * Tech Stack Item API Route
 *
 * PATCH  /api/projects/:slug/tech-stack/:itemId - Update a tech stack item
 * DELETE /api/projects/:slug/tech-stack/:itemId - Delete a tech stack item
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; itemId: string }> }
) {
  try {
    const { itemId } = await params
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

    return NextResponse.json({ data: item, cached: false })
  } catch (err) {
    console.error('Tech stack PATCH error:', err)
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; itemId: string }> }
) {
  try {
    const { itemId } = await params

    const { error } = await tables.project_tech_stack
      .delete()
      .eq('id', itemId)

    if (error) {
      return NextResponse.json({ error: { message: error.message } }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('Tech stack DELETE error:', err)
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
