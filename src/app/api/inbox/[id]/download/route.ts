import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiError } from '@/types/api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params

    const { data, error } = await tables.inbox_items
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Inbox item ${id} not found` } } satisfies ApiError,
        { status: 404 }
      )
    }

    const content = data.content || ''
    const metadata = (data.metadata as Record<string, unknown>) || {}
    const fileType = (metadata.file_type as string) || 'text/markdown'
    const fileName = (metadata.file_name as string) || `${data.filename || 'download'}`

    // If it was an uploaded file with base64 content, decode it
    if (metadata.uploaded) {
      try {
        const buffer = Buffer.from(content, 'base64')
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': fileType,
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Length': buffer.length.toString(),
          },
        })
      } catch {
        // Fall through to text response if base64 decode fails
      }
    }

    // Plain text/markdown content
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `inline; filename="${fileName}"`,
      },
    })
  } catch (err) {
    console.error('Inbox download error:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to download item' } } satisfies ApiError,
      { status: 500 }
    )
  }
}
