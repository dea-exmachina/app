import { NextRequest, NextResponse } from 'next/server'
import { getDataSource } from '@/lib/server/github-client'
import { withCache } from '@/lib/server/cache'
import { parseSkillList } from '@/lib/server/parsers/skill'
import { parseWorkflow } from '@/lib/server/parsers/workflow'
import type { ApiResponse, ApiError } from '@/types/api'
import type { SkillDetail } from '@/types/skill'

const TTL_MS = 10 * 60 * 1000 // 10 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
): Promise<NextResponse<ApiResponse<SkillDetail> | ApiError>> {
  try {
    const { name } = await params
    const ds = getDataSource()

    const { data, cached } = await withCache(
      `skills:detail:${name}`,
      TTL_MS,
      async () => {
        // Parse skill list
        const skillsFile = await ds.getFile('tools/dea-skilllist.md')
        if (!skillsFile) {
          throw new Error('Skill list not found')
        }

        const skills = parseSkillList(skillsFile.content)
        const skill = skills.find((s) => s.name === name)

        if (!skill) {
          throw new Error(`Skill '${name}' not found`)
        }

        // Parse linked workflow if exists
        let linkedWorkflow = null
        if (skill.workflow) {
          const workflowPath = `workflows/public/${skill.workflow}`
          const workflowFile = await ds.getFile(workflowPath)

          if (workflowFile) {
            linkedWorkflow = parseWorkflow(
              workflowFile.content,
              workflowFile.path
            )
          }
        }

        const detail: SkillDetail = {
          ...skill,
          linkedWorkflow,
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

    console.error('Error fetching skill detail:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch skill detail',
        },
      },
      { status: 500 }
    )
  }
}
