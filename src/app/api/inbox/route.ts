import { NextRequest, NextResponse } from 'next/server'
import { getDataSource } from '@/lib/server/github-client'
import { withCache, invalidateCache } from '@/lib/server/cache'
import { parseInboxItem } from '@/lib/server/parsers/inbox'
import type { ApiResponse, ApiError } from '@/types/api'
import type { InboxItem, InboxCreateRequest } from '@/types/inbox'

const TTL_MS = 5 * 60 * 1000 // 5 minutes (shorter for inbox)

const INBOX_PATH = 'inbox/dea-box'

export async function GET(): Promise<
  NextResponse<ApiResponse<InboxItem[]> | ApiError>
> {
  try {
    const ds = getDataSource()

    const { data, cached } = await withCache(
      'inbox:all',
      TTL_MS,
      async () => {
        const entries = await ds.listDirectory(INBOX_PATH)
        if (entries.length === 0) {
          return []
        }

        // Filter to .md files only (not directories)
        const mdFiles = entries.filter((entry) => entry.endsWith('.md'))

        const items: InboxItem[] = []

        for (const filePath of mdFiles) {
          const file = await ds.getFile(filePath)
          if (!file) continue

          const filename = filePath.split('/').pop() ?? filePath
          const item = parseInboxItem(file.content, filename, file.sha)
          items.push(item)
        }

        // Sort by created date, newest first
        items.sort((a, b) => {
          if (!a.created || !b.created) return 0
          return new Date(b.created).getTime() - new Date(a.created).getTime()
        })

        return items
      }
    )

    return NextResponse.json({ data, cached })
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
    const ds = getDataSource()

    if (!ds.createFile) {
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

    // Build markdown content
    const fileContent = [
      '---',
      `type: ${body.type}`,
      'status: pending',
      `created: ${now.toISOString()}`,
      'source: webapp',
      '---',
      '',
      `# ${body.title}`,
      '',
      body.content,
      '',
    ].join('\n')

    const filePath = `${INBOX_PATH}/${filename}`
    const result = await ds.createFile(
      filePath,
      fileContent,
      `[inbox] Add ${body.type}: ${body.title}`
    )

    // Invalidate cache after write
    invalidateCache('inbox:all')

    const item: InboxItem = {
      filename,
      title: body.title,
      type: body.type,
      status: 'pending',
      created: now.toISOString(),
      source: 'webapp',
      content: body.content,
      sha: result.sha,
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
