/**
 * Project Notes API Route
 *
 * PATCH /api/projects/:slug/notes - Update notes within projects.settings JSONB
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ProjectNotes } from '@/types/project'
import type { ErrorResponse } from '@/types/project'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse<{ data: ProjectNotes; cached: boolean } | ErrorResponse>> {
  try {
    const { slug } = await params
    const body = await request.json() as Partial<ProjectNotes>

    // Detect UUID vs slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
    const column = isUuid ? 'id' : 'slug'

    // Fetch current project
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

    // Merge notes into settings
    const currentSettings = (project.settings || {}) as Record<string, unknown>
    const currentNotes = (currentSettings.notes || { checklist: [], freeform: '' }) as ProjectNotes

    const updatedNotes: ProjectNotes = {
      checklist: body.checklist !== undefined ? body.checklist : currentNotes.checklist,
      freeform: body.freeform !== undefined ? body.freeform : currentNotes.freeform,
    }

    const updatedSettings = {
      ...currentSettings,
      notes: updatedNotes,
    }

    // Write back — cast to satisfy Supabase Json type constraint
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
  } catch (error) {
    console.error('Unexpected error updating project notes:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
