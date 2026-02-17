import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { InboxItem } from '@/types/inbox'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
): Promise<NextResponse<ApiResponse<InboxItem> | ApiError>> {
  try {
    const { filename } = await params

    const { data: row, error } = await tables.inbox_items
      .select('*')
      .eq('filename', filename)
      .single()

    if (error || !row) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `Inbox item '${filename}' not found`,
          },
        },
        { status: 404 }
      )
    }

    const item: InboxItem = {
      id: row.id,
      filename: row.filename,
      title: row.title,
      type: row.type as InboxItem['type'],
      status: row.status as InboxItem['status'],
      created: row.created,
      source: row.source,
      content: row.content,
      created_at: row.created_at,
      updated_at: row.updated_at,
      project_id: row.project_id,
      priority: row.priority,
      file_path: row.file_path,
      file_size: row.file_size,
      mime_type: row.mime_type,
      linked_card_id: row.linked_card_id,
      assigned_to: row.assigned_to,
      tags: row.tags ?? [],
      sha: row.id,
    }

    return NextResponse.json({ data: item, cached: false })
  } catch (error) {
    console.error('Error fetching inbox item:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch inbox item',
        },
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
): Promise<NextResponse<ApiResponse<InboxItem> | ApiError>> {
  try {
    const { filename } = await params
    const body = await request.json()

    // Only allow updating status
    if (!body.status) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'status is required',
          },
        },
        { status: 400 }
      )
    }

    const { data: row, error } = await tables.inbox_items
      .update({ status: body.status })
      .eq('filename', filename)
      .select()
      .single()

    if (error || !row) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `Inbox item '${filename}' not found`,
          },
        },
        { status: 404 }
      )
    }

    const item: InboxItem = {
      id: row.id,
      filename: row.filename,
      title: row.title,
      type: row.type as InboxItem['type'],
      status: row.status as InboxItem['status'],
      created: row.created,
      source: row.source,
      content: row.content,
      created_at: row.created_at,
      updated_at: row.updated_at,
      project_id: row.project_id,
      priority: row.priority,
      file_path: row.file_path,
      file_size: row.file_size,
      mime_type: row.mime_type,
      linked_card_id: row.linked_card_id,
      assigned_to: row.assigned_to,
      tags: row.tags ?? [],
      sha: row.id,
    }

    return NextResponse.json({ data: item, cached: false })
  } catch (error) {
    console.error('Error updating inbox item:', error)
    return NextResponse.json(
      {
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update inbox item',
        },
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
): Promise<NextResponse<{ success: boolean } | ApiError>> {
  try {
    const { filename } = await params

    const { error } = await tables.inbox_items
      .delete()
      .eq('filename', filename)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting inbox item:', error)
    return NextResponse.json(
      {
        error: {
          code: 'DELETE_ERROR',
          message: 'Failed to delete inbox item',
        },
      },
      { status: 500 }
    )
  }
}
