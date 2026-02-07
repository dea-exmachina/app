import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { Canvas, CanvasSummary, CreateCanvasInput, CanvasData } from '@/types/canvas'

/**
 * GET /api/canvas
 * List all canvases (summary view without full data)
 */
export async function GET(): Promise<
  NextResponse<ApiResponse<CanvasSummary[]> | ApiError>
> {
  try {
    const { data, error } = await tables.canvases
      .select('id, title, description, thumbnail, project_id, created_at, updated_at, data')
      .order('updated_at', { ascending: false })

    if (error) {
      throw error
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const summaries: CanvasSummary[] = (data ?? []).map((row: any) => {
      const canvasData = row.data as CanvasData | null
      const elementCount = canvasData?.elements?.length ?? 0

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        thumbnail: row.thumbnail,
        project_id: row.project_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        element_count: elementCount,
      }
    })

    return NextResponse.json({ data: summaries, cached: false })
  } catch (error) {
    console.error('Error fetching canvases:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch canvases',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/canvas
 * Create a new canvas
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Canvas> | ApiError>> {
  try {
    const body = (await request.json()) as CreateCanvasInput

    const { data, error } = await tables.canvases
      .insert({
        title: body.title?.trim() || 'Untitled',
        description: body.description?.trim() || null,
        project_id: body.project_id || null,
        data: body.data || {},
      })
      .select('*')
      .single()

    if (error) {
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

    return NextResponse.json({ data: canvas, cached: false }, { status: 201 })
  } catch (error) {
    console.error('Error creating canvas:', error)
    return NextResponse.json(
      {
        error: {
          code: 'CREATE_ERROR',
          message: 'Failed to create canvas',
        },
      },
      { status: 500 }
    )
  }
}
