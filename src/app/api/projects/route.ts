import { NextResponse } from 'next/server'
import { getDataSource } from '@/lib/server/github-client'
import { withCache } from '@/lib/server/cache'
import { parseProjectBrief } from '@/lib/server/parsers/project'
import type { ApiResponse, ApiError } from '@/types/api'
import type { Project } from '@/types/project'

const TTL_MS = 10 * 60 * 1000 // 10 minutes

export async function GET(): Promise<
  NextResponse<ApiResponse<Project[]> | ApiError>
> {
  try {
    const ds = getDataSource()

    const { data, cached } = await withCache(
      'projects:all',
      TTL_MS,
      async () => {
        const entries = await ds.listDirectory('portfolio')
        if (entries.length === 0) {
          return []
        }

        // Filter to directories only (no .md extension, not INDEX.md/README.md)
        const dirs = entries.filter((entry) => {
          const name = entry.split('/').pop() ?? ''
          return !name.includes('.') && name !== 'INDEX' && name !== 'README'
        })

        const projects: Project[] = []

        for (const dirPath of dirs) {
          const projectId = dirPath.split('/').pop() ?? dirPath

          // Try to get brief.md
          const briefFile = await ds.getFile(`${dirPath}/brief.md`)
          if (!briefFile) continue

          // List files in project dir
          const projectFiles = await ds.listDirectory(dirPath)
          const fileNames = projectFiles.map((f) => f.split('/').pop() ?? f)

          const project = parseProjectBrief(
            briefFile.content,
            projectId,
            fileNames
          )
          projects.push(project)
        }

        return projects
      }
    )

    return NextResponse.json({ data, cached })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch projects',
        },
      },
      { status: 500 }
    )
  }
}
