import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.title || !body.type || !body.file_name || !body.file_content) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Missing required fields: title, type, file_name, file_content' } } satisfies ApiError,
        { status: 400 }
      )
    }

    // Validate file size
    if (body.file_size && body.file_size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: { code: 'FILE_TOO_LARGE', message: 'File size exceeds 10MB limit' } } satisfies ApiError,
        { status: 413 }
      )
    }

    // Generate filename
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const slug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
    const filename = `${timestamp}-${slug}.md`

    const { data, error } = await tables.inbox_items
      .insert({
        title: body.title,
        type: body.type,
        content: body.file_content,
        filename,
        status: 'pending',
        metadata: {
          file_name: body.file_name,
          file_type: body.file_type || 'application/octet-stream',
          file_size: body.file_size || 0,
          uploaded: true,
        },
        priority: body.priority || 'normal',
        project_id: body.project_id || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Inbox upload insert error:', error)
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } } satisfies ApiError,
        { status: 500 }
      )
    }

    return NextResponse.json({ data, cached: false } satisfies ApiResponse<typeof data>)
  } catch (err) {
    console.error('Inbox upload error:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to process upload' } } satisfies ApiError,
      { status: 500 }
    )
  }
}
