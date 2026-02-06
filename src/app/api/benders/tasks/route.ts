import { NextRequest, NextResponse } from 'next/server'
import { getDataSource } from '@/lib/server/github-client'
import { withCache, invalidateCache } from '@/lib/server/cache'
import { parseBenderTask } from '@/lib/server/parsers/bender-task'
import type { ApiResponse, ApiError } from '@/types/api'
import type { BenderTask, BenderTaskCreateRequest } from '@/types/bender'

const TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function GET(): Promise<
  NextResponse<ApiResponse<BenderTask[]> | ApiError>
> {
  try {
    const ds = getDataSource()

    const { data, cached } = await withCache(
      'benders:tasks:all',
      TTL_MS,
      async () => {
        // Get both active tasks and archived tasks
        const activeFiles = await ds.listDirectory('inbox/bender-box/tasks')
        const archiveFiles = await ds.listDirectory(
          'inbox/bender-box/archive'
        )

        const allFiles = [
          ...activeFiles.filter((f) => f.endsWith('.md')),
          ...archiveFiles.filter((f) => f.endsWith('.md')),
        ]

        const tasks = await Promise.all(
          allFiles.map(async (path) => {
            const file = await ds.getFile(path)
            if (!file) return null

            return parseBenderTask(file.content, file.path)
          })
        )

        return tasks.filter((t): t is BenderTask => t !== null)
      }
    )

    return NextResponse.json({ data, cached })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch bender tasks',
        },
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<BenderTask> | ApiError>> {
  try {
    const body = (await request.json()) as BenderTaskCreateRequest

    // Validate required fields
    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: { code: 'VALIDATION', message: 'Title is required' } },
        { status: 400 }
      )
    }
    if (!body.overview?.trim()) {
      return NextResponse.json(
        { error: { code: 'VALIDATION', message: 'Overview is required' } },
        { status: 400 }
      )
    }
    if (!body.requirements?.length) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION',
            message: 'At least one requirement is required',
          },
        },
        { status: 400 }
      )
    }
    if (!body.acceptanceCriteria?.length) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION',
            message: 'At least one acceptance criterion is required',
          },
        },
        { status: 400 }
      )
    }

    const ds = getDataSource()

    // Find next task number by scanning existing tasks
    const nextNum = await getNextTaskNumber(ds)
    const today = new Date().toISOString().split('T')[0]
    const slug = body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40)
    const filename = `TASK-${String(nextNum).padStart(3, '0')}-${today}-${slug}.md`
    const taskId = `TASK-${String(nextNum).padStart(3, '0')}`
    const filePath = `inbox/bender-box/tasks/${filename}`

    // Build markdown
    const markdown = buildTaskMarkdown({
      taskId,
      today,
      title: body.title.trim(),
      overview: body.overview.trim(),
      context: body.context?.trim(),
      requirements: body.requirements,
      acceptanceCriteria: body.acceptanceCriteria,
      references: body.references,
      constraints: body.constraints,
      priority: body.priority || 'normal',
      branch: body.branch || 'dev',
    })

    // Create the task file
    await ds.createFile!(filePath, markdown, `[${taskId}] Create task: ${body.title.trim()}`)

    // Update kanban board
    await updateKanbanBoard(ds, taskId, body.title.trim(), body.overview.trim())

    // Invalidate caches
    invalidateCache('benders:tasks:all')
    invalidateCache('kanban:board:bender')

    // Parse the created task to return it
    const task = parseBenderTask(markdown, filePath)

    return NextResponse.json({ data: task, cached: false }, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      {
        error: {
          code: 'CREATE_ERROR',
          message: 'Failed to create bender task',
        },
      },
      { status: 500 }
    )
  }
}

async function getNextTaskNumber(
  ds: ReturnType<typeof getDataSource>
): Promise<number> {
  const activeFiles = await ds.listDirectory('inbox/bender-box/tasks')
  const archiveFiles = await ds.listDirectory('inbox/bender-box/archive')
  const allFiles = [...activeFiles, ...archiveFiles]

  let maxNum = 0
  for (const f of allFiles) {
    const match = f.match(/TASK-(\d+)/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxNum) maxNum = num
    }
  }

  return maxNum + 1
}

function buildTaskMarkdown(opts: {
  taskId: string
  today: string
  title: string
  overview: string
  context?: string
  requirements: string[]
  acceptanceCriteria: string[]
  references?: string[]
  constraints?: string[]
  priority: string
  branch: string
}): string {
  const lines: string[] = [
    '---',
    `task_id: ${opts.taskId}-${opts.today}`,
    `title: "${opts.title}"`,
    `created: ${opts.today}`,
    'type: task-bender',
    'bender: unassigned',
    'status: proposed',
    `priority: ${opts.priority}`,
    `branch: ${opts.branch}`,
    '---',
    '',
    `# ${opts.taskId}: ${opts.title}`,
    '',
    `**Task ID**: \`${opts.taskId}-${opts.today}\``,
    '**Assigned to**: unassigned',
    '**Status**: Proposed',
    `**Priority**: ${opts.priority}`,
    `**Created**: ${opts.today}`,
    `**Branch**: ${opts.branch}`,
    '',
    '---',
    '',
    '## Overview',
    '',
    opts.overview,
    '',
  ]

  if (opts.context) {
    lines.push('## Context', '', opts.context, '')
  }

  lines.push('## Requirements', '')
  for (const req of opts.requirements) {
    lines.push(`- ${req}`)
  }
  lines.push('')

  lines.push('## Acceptance Criteria', '')
  for (const ac of opts.acceptanceCriteria) {
    lines.push(`- [ ] ${ac}`)
  }
  lines.push('')

  if (opts.references?.length) {
    lines.push('## References', '')
    for (const ref of opts.references) {
      lines.push(`- ${ref}`)
    }
    lines.push('')
  }

  if (opts.constraints?.length) {
    lines.push('## Constraints', '')
    for (const c of opts.constraints) {
      lines.push(`- ${c}`)
    }
    lines.push('')
  }

  lines.push(
    '## Deliverables',
    '',
    '_To be defined by bender during execution._',
    '',
    '---',
    '',
    '## Execution Notes',
    '',
    '### Questions',
    '',
    '_Pre-flight: Any unclear points before starting?_',
    '',
    '### Approach',
    '',
    '_To be filled by bender during execution._',
    '',
    '### Blockers',
    '',
    '_None identified._',
    '',
    '---',
    '',
    `_Task created: ${opts.today}_`,
    ''
  )

  return lines.join('\n')
}

async function updateKanbanBoard(
  ds: ReturnType<typeof getDataSource>,
  taskId: string,
  title: string,
  overview: string
): Promise<void> {
  const kanbanPath = 'kanban/bender.md'
  const file = await ds.getFile(kanbanPath)
  if (!file || !file.sha) return

  const card = `- [ ] **${taskId}: ${title}** #task #bender<br>${overview}`

  // Insert after ## Proposed heading
  const lines = file.content.split('\n')
  const proposedIdx = lines.findIndex((l) => l.trim() === '## Proposed')
  if (proposedIdx === -1) return

  lines.splice(proposedIdx + 1, 0, '', card)
  const updated = lines.join('\n')

  await ds.createFile!(
    kanbanPath,
    updated,
    `[${taskId}] Add to kanban: ${title}`,
    file.sha
  )
}
