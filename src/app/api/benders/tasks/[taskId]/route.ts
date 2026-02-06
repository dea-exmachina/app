import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { BenderTask } from '@/types/bender'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
): Promise<NextResponse<ApiResponse<BenderTask> | ApiError>> {
  try {
    const { taskId } = await params

    const { data: row, error } = await tables.bender_tasks
      .select('*')
      .eq('task_id', taskId)
      .single()

    if (error || !row) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `Task '${taskId}' not found`,
          },
        },
        { status: 404 }
      )
    }

    const task: BenderTask = {
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
    }

    return NextResponse.json({ data: task, cached: false })
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch task',
        },
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
): Promise<NextResponse<ApiResponse<BenderTask> | ApiError>> {
  try {
    const { taskId } = await params
    const body = await request.json()

    // Build update object from allowed fields
    const updates: Record<string, unknown> = {}
    if (body.status) updates.status = body.status
    if (body.bender) updates.bender_role = body.bender
    if (body.priority) updates.priority = body.priority
    if (body.branch) updates.branch = body.branch
    if (body.review) {
      updates.review_decision = body.review.decision
      updates.review_feedback = body.review.feedback
    }

    const { data: row, error } = await tables.bender_tasks
      .update(updates)
      .eq('task_id', taskId)
      .select()
      .single()

    if (error || !row) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `Task '${taskId}' not found`,
          },
        },
        { status: 404 }
      )
    }

    const task: BenderTask = {
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
    }

    return NextResponse.json({ data: task, cached: false })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      {
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update task',
        },
      },
      { status: 500 }
    )
  }
}
