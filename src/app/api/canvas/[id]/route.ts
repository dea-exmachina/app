import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ApiResponse, ApiError } from '@/types/api'
import type { Canvas, UpdateCanvasInput, CanvasData } from '@/types/canvas'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/canvas/[id]
 * Get a single canvas with full data (owner only)
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<Canvas> | ApiError>> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
    }

    const { id } = await context.params

    const { data, error } = await tables.canvases
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Canvas not found' } },
          { status: 404 }
        )
      }
      throw error
    }

    const canvas: Canvas = {
      id: data.id,
      title: data.title,
      description: data.description,
      data: data.data as CanvasData,
      thumbnail: data.thumbnail,
      project_id: data.project_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    return NextResponse.json({ data: canvas, cached: false })
  } catch (error) {
    console.error('Error fetching canvas:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch canvas',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/canvas/[id]
 * Update a canvas (for auto-save)
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<Canvas> | ApiError>> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
    }

    const { id } = await context.params
    const body = (await request.json()) as UpdateCanvasInput

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}

    if (body.title !== undefined) {
      updateData.title = body.title.trim() || 'Untitled'
    }
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null
    }
    if (body.data !== undefined) {
      updateData.data = body.data
    }
    if (body.thumbnail !== undefined) {
      updateData.thumbnail = body.thumbnail
    }
    if (body.project_id !== undefined) {
      updateData.project_id = body.project_id
    }

    const { data, error } = await tables.canvases
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Canvas not found' } },
          { status: 404 }
        )
      }
      throw error
    }

    const canvas: Canvas = {
      id: data.id,
      title: data.title,
      description: data.description,
      data: data.data as CanvasData,
      thumbnail: data.thumbnail,
      project_id: data.project_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    return NextResponse.json({ data: canvas, cached: false })
  } catch (error) {
    console.error('Error updating canvas:', error)
    return NextResponse.json(
      {
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update canvas',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/canvas/[id]
 * Delete a canvas
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<{ deleted: true }> | ApiError>> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
    }

    const { id } = await context.params

    const { error } = await tables.canvases
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ data: { deleted: true }, cached: false })
  } catch (error) {
    console.error('Error deleting canvas:', error)
    return NextResponse.json(
      {
        error: {
          code: 'DELETE_ERROR',
          message: 'Failed to delete canvas',
        },
      },
      { status: 500 }
    )
  }
}
