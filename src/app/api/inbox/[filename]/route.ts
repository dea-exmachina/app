import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { InboxItem } from '@/types/inbox'

function mapRow(row: Record<string, unknown>): InboxItem {
  return {
    id: row.id as string,
    filename: row.filename as string,
    title: row.title as string,
    type: row.type as InboxItem['type'],
    status: row.status as InboxItem['status'],
    created: row.created as string,
    source: row.source as string,
    content: row.content as string,
    sha: row.id as string,
    projectId: (row.project_id as string) ?? null,
    priority: (row.priority as InboxItem['priority']) ?? 'normal',
    fileSize: (row.file_size as number) ?? null,
    mimeType: (row.mime_type as string) ?? null,
    linkedCardId: (row.linked_card_id as string) ?? null,
    tags: (row.tags as string[]) ?? [],
  }
}

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

    const item: InboxItem = mapRow(row)

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

    // Build update object from allowed fields
    const allowedFields: Record<string, string> = {
      status: 'status',
      linkedCardId: 'linked_card_id',
      projectId: 'project_id',
      priority: 'priority',
      assignedTo: 'assigned_to',
      tags: 'tags',
    }

    const updates: Record<string, unknown> = {}
    for (const [camel, snake] of Object.entries(allowedFields)) {
      if (body[camel] !== undefined) {
        updates[snake] = body[camel]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one field to update is required',
          },
        },
        { status: 400 }
      )
    }

    updates.updated_at = new Date().toISOString()

    const { data: row, error } = await tables.inbox_items
      .update(updates)
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

    const item: InboxItem = mapRow(row)

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
