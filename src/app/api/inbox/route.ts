import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { InboxItem, InboxCreateRequest } from '@/types/inbox'

export async function GET(): Promise<
  NextResponse<ApiResponse<InboxItem[]> | ApiError>
> {
  try {
    const { data, error } = await tables.inbox_items
      .select('*')
      .order('created', { ascending: false })

    if (error) {
      throw error
    }

    // Map database columns to InboxItem interface
    const items: InboxItem[] = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      filename: row.filename,
      title: row.title,
      type: row.type as InboxItem['type'],
      status: row.status as InboxItem['status'],
      created: row.created,
      source: row.source,
      content: row.content,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      project_id: row.project_id as string | null,
      priority: row.priority as InboxItem['priority'],
      file_path: row.file_path as string | null,
      file_size: row.file_size as number | null,
      mime_type: row.mime_type as string | null,
      linked_card_id: row.linked_card_id as string | null,
      assigned_to: row.assigned_to as string | null,
      tags: (row.tags as string[]) ?? [],
      sha: row.id as string,
    }))

    return NextResponse.json({ data: items, cached: false })
  } catch (error) {
    console.error('Error fetching inbox:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch inbox items',
        },
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<InboxItem> | ApiError>> {
  try {
    const body: InboxCreateRequest = await request.json()

    if (!body.title || !body.content || !body.type) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'title, content, and type are required',
          },
        },
        { status: 400 }
      )
    }

    // Generate filename: timestamp-slug.md
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const slug = body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50)
    const filename = `${timestamp}-${slug}.md`

    const { data: row, error } = await tables.inbox_items
      .insert({
        filename,
        title: body.title,
        type: body.type,
        status: 'pending',
        created: now.toISOString(),
        source: 'webapp',
        content: body.content,
      })
      .select()
      .single()

    if (error) {
      throw error
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
    console.error('Error creating inbox item:', error)
    return NextResponse.json(
      {
        error: {
          code: 'WRITE_ERROR',
          message: 'Failed to create inbox item',
        },
      },
      { status: 500 }
    )
  }
}
