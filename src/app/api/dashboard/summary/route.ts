import { NextResponse } from 'next/server'
import { Octokit } from 'octokit'
import { getDataSource } from '@/lib/server/github-client'
import { withCache } from '@/lib/server/cache'
import { parseKanbanBoard } from '@/lib/server/parsers/kanban'
import { parseSkillList } from '@/lib/server/parsers/skill'
import { parseWorkflow } from '@/lib/server/parsers/workflow'
import { parsePlatformRegistry } from '@/lib/server/parsers/bender-platform'
import { parseBenderTask } from '@/lib/server/parsers/bender-task'
import { BOARD_MAP } from '@/config/boards'
import type { ApiResponse, ApiError } from '@/types/api'
import type { DashboardSummary } from '@/types/dashboard'
import type { BoardSummary } from '@/types/kanban'

const TTL_MS = 2 * 60 * 1000 // 2 minutes

export async function GET(): Promise<
  NextResponse<ApiResponse<DashboardSummary> | ApiError>
> {
  try {
    const ds = getDataSource()

    const { data, cached } = await withCache(
      'dashboard:summary',
      TTL_MS,
      async () => {
        // Parse management board for handoff
        const mgmtFile = await ds.getFile('kanban/management.md')
        if (!mgmtFile) {
          throw new Error('Management board not found')
        }
        const mgmtBoard = parseKanbanBoard(
          mgmtFile.content,
          'management',
          mgmtFile.path
        )
        if (!mgmtBoard.handoff) {
          throw new Error('Handoff section not found')
        }

        // Get board summaries
        const boardStats: BoardSummary[] = []
        for (const [id, config] of Object.entries(BOARD_MAP)) {
          const file = await ds.getFile(config.path)
          if (!file) continue

          const board = parseKanbanBoard(file.content, id, file.path)
          const laneStats = board.lanes.map((lane) => ({
            name: lane.name,
            total: lane.cards.length,
            completed: lane.cards.filter((c) => c.completed).length,
          }))

          const totalOpen = board.lanes.reduce(
            (sum, lane) =>
              sum + lane.cards.filter((c) => !c.completed).length,
            0
          )
          const totalCompleted = board.lanes.reduce(
            (sum, lane) => sum + lane.cards.filter((c) => c.completed).length,
            0
          )

          boardStats.push({
            id,
            name: config.name,
            filePath: config.path,
            laneStats,
            totalOpen,
            totalCompleted,
          })
        }

        // Count skills
        const skillsFile = await ds.getFile('tools/dea-skilllist.md')
        const skillCount = skillsFile
          ? parseSkillList(skillsFile.content).length
          : 0

        // Count workflows
        const workflowFiles = await ds.listDirectory('workflows/public')
        const workflowCount = workflowFiles.filter((f) =>
          f.endsWith('.md')
        ).length

        // Get active benders from platforms
        const platformFile = await ds.getFile(
          'benders/context/shared/platform-registry.md'
        )
        const platforms = platformFile
          ? parsePlatformRegistry(platformFile.content)
          : []

        // Get active tasks to count per platform
        const taskFiles = await ds.listDirectory('inbox/bender-box/tasks')
        const tasks = await Promise.all(
          taskFiles
            .filter((f) => f.endsWith('.md'))
            .map(async (path) => {
              const file = await ds.getFile(path)
              if (!file) return null
              return parseBenderTask(file.content, file.path)
            })
        )

        const validTasks = tasks.filter((t) => t !== null)

        const activeBenders = platforms
          .filter((p) => p.status === 'active')
          .map((p) => ({
            platform: p.name,
            status: p.status,
            activeTasks: validTasks.filter(
              (t) => t.status === 'executing' || t.status === 'delivered'
            ).length,
          }))

        // Get recent commits
        const token = process.env.GITHUB_TOKEN
        const owner = process.env.GITHUB_OWNER ?? 'george-a-ata'
        const repo = process.env.GITHUB_REPO ?? 'dea-exmachina'

        const octokit = new Octokit({ auth: token })
        const commitsResponse = await octokit.rest.repos.listCommits({
          owner,
          repo,
          per_page: 5,
        })

        const recentCommits = commitsResponse.data.map((commit) => ({
          sha: commit.sha.substring(0, 7),
          message: commit.commit.message.split('\n')[0],
          date: commit.commit.committer?.date || '',
        }))

        const summary: DashboardSummary = {
          handoff: mgmtBoard.handoff,
          boardStats,
          activeBenders,
          skillCount,
          workflowCount,
          recentCommits,
        }

        return summary
      }
    )

    return NextResponse.json({ data, cached })
  } catch (error) {
    console.error('Error fetching dashboard summary:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch dashboard summary',
        },
      },
      { status: 500 }
    )
  }
}
