import { NextRequest, NextResponse } from 'next/server'
import { getDataSource } from '@/lib/server/github-client'
import { withCache } from '@/lib/server/cache'
import { parseProjectBrief } from '@/lib/server/parsers/project'
import { parseFrontmatter } from '@/lib/server/parsers/common'
import type { ApiResponse, ApiError } from '@/types/api'
import type { ProjectDetail } from '@/types/project'

const TTL_MS = 10 * 60 * 1000 // 10 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<ProjectDetail> | ApiError>> {
  try {
    const { id } = await params
    const ds = getDataSource()

    const { data, cached } = await withCache(
      `projects:detail:${id}`,
      TTL_MS,
      async () => {
        const briefFile = await ds.getFile(`portfolio/${id}/brief.md`)
        if (!briefFile) {
          throw new Error(`Project '${id}' not found`)
        }

        // List files in project dir
        const projectFiles = await ds.listDirectory(`portfolio/${id}`)
        const fileNames = projectFiles.map((f) => f.split('/').pop() ?? f)

        const project = parseProjectBrief(briefFile.content, id, fileNames)

        // Get the full content (after frontmatter) for the detail view
        const { content } = parseFrontmatter(briefFile.content)

        const detail: ProjectDetail = {
          ...project,
          content,
        }

        return detail
      }
    )

    return NextResponse.json({ data, cached })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('not found')) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message,
          },
        },
        { status: 404 }
      )
    }

    console.error('Error fetching project detail:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch project detail',
        },
      },
      { status: 500 }
    )
  }
}
