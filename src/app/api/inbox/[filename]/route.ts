import { NextRequest, NextResponse } from 'next/server'
import { getDataSource } from '@/lib/server/github-client'
import { invalidateCache } from '@/lib/server/cache'
import type { ApiError } from '@/types/api'

const INBOX_PATH = 'inbox/dea-box'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
): Promise<NextResponse<{ success: boolean } | ApiError>> {
  try {
    const { filename } = await params
    const ds = getDataSource()

    if (!ds.deleteFile) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_SUPPORTED',
            message: 'Write operations not supported by current data source',
          },
        },
        { status: 501 }
      )
    }

    const filePath = `${INBOX_PATH}/${filename}`

    // Get file to obtain SHA
    const file = await ds.getFile(filePath)
    if (!file || !file.sha) {
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

    await ds.deleteFile(filePath, file.sha, `[inbox] Remove: ${filename}`)

    // Invalidate cache
    invalidateCache('inbox:all')

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
