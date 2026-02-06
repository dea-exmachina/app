import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { KanbanBoard, KanbanLane, HandoffSection } from '@/types/kanban'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
): Promise<NextResponse<ApiResponse<KanbanBoard> | ApiError>> {
  try {
    const { boardId } = await params

    const { data: row, error } = await tables.kanban_boards
      .select('*')
      .eq('slug', boardId)
      .single()

    if (error || !row) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `Board '${boardId}' not found`,
          },
        },
        { status: 404 }
      )
    }

    // Parse lanes from JSONB
    const lanes = (row.lanes as unknown as KanbanLane[]) ?? []

    // Extract handoff section if present (stored in first lane or separate field)
    // For now, handoff is null as it's not stored in Supabase schema
    const handoff: HandoffSection | null = null

    const board: KanbanBoard = {
      id: row.slug,
      name: row.name,
      filePath: row.markdown_path ?? '',
      handoff,
      lanes,
    }

    return NextResponse.json({ data: board, cached: false })
  } catch (error) {
    console.error('Error fetching board:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch board',
        },
      },
      { status: 500 }
    )
  }
}
