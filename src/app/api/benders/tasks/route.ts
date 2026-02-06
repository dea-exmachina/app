import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { BenderTask, BenderTaskCreateRequest } from '@/types/bender'

export async function GET(): Promise<
  NextResponse<ApiResponse<BenderTask[]> | ApiError>
> {
  try {
    const { data, error } = await tables.bender_tasks
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Map database columns to BenderTask interface
    const tasks: BenderTask[] = (data ?? []).map((row) => ({
      taskId: row.task_id,
      title: row.title,
      created: row.created_at?.split('T')[0] ?? '',
      bender: row.bender_role ?? 'unassigned',
      status: (row.status as BenderTask['status']) ?? 'proposed',
      priority: (row.priority as BenderTask['priority']) ?? 'normal',
      branch: row.branch ?? 'dev',
      overview: row.overview ?? '',
      requirements: (row.requirements as string[]) ?? [],
      acceptanceCriteria: (row.acceptance_criteria as string[]) ?? [],
      review: row.review_decision
        ? {
            decision: row.review_decision as 'ACCEPT' | 'PARTIAL' | 'REJECT',
            feedback: row.review_feedback ?? '',
          }
        : null,
      filePath: row.markdown_path ?? '',
    }))

    return NextResponse.json({ data: tasks, cached: false })
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

    // Get next task number
    const { data: maxTask } = await tables.bender_tasks
      .select('task_id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let nextNum = 1
    if (maxTask?.task_id) {
      const match = maxTask.task_id.match(/TASK-(\d+)/)
      if (match) {
        nextNum = parseInt(match[1], 10) + 1
      }
    }

    const today = new Date().toISOString().split('T')[0]
    const taskId = `TASK-${String(nextNum).padStart(3, '0')}`
    const slug = body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40)
    const filename = `${taskId}-${today}-${slug}.md`
    const filePath = `inbox/bender-box/tasks/${filename}`

    // Insert into Supabase
    // Note: project_id is required but we use a system default for standalone tasks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (tables.bender_tasks as any)
      .insert({
        task_id: taskId,
        title: body.title.trim(),
        overview: body.overview.trim(),
        status: 'proposed',
        priority: body.priority || 'normal',
        branch: body.branch || 'dev',
        bender_role: 'unassigned',
        requirements: body.requirements,
        acceptance_criteria: body.acceptanceCriteria,
        markdown_path: filePath,
        project_id: '00000000-0000-0000-0000-000000000000', // System default project
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    const task: BenderTask = {
      taskId: row.task_id,
      title: row.title,
      created: row.created_at?.split('T')[0] ?? today,
      bender: row.bender_role ?? 'unassigned',
      status: (row.status as BenderTask['status']) ?? 'proposed',
      priority: (row.priority as BenderTask['priority']) ?? 'normal',
      branch: row.branch ?? 'dev',
      overview: row.overview ?? '',
      requirements: (row.requirements as string[]) ?? [],
      acceptanceCriteria: (row.acceptance_criteria as string[]) ?? [],
      review: null,
      filePath: row.markdown_path ?? '',
    }

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
