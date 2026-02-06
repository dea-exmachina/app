import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { Workflow, WorkflowSection } from '@/types/workflow'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
): Promise<NextResponse<ApiResponse<Workflow> | ApiError>> {
  try {
    const { name } = await params

    // Try to find by name first, fallback to slug
    let { data: row, error } = await tables.workflows
      .select('*')
      .eq('slug', name)
      .single()

    if (error || !row) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `Workflow '${name}' not found`,
          },
        },
        { status: 404 }
      )
    }

    // Map database columns to Workflow interface
    // Handle both old schema (slug, markdown_path) and new schema (name, file_path)
    const record = row as Record<string, unknown>
    const workflow: Workflow = {
      name: (record.name as string) ?? row.slug,
      title: row.title,
      workflowType: (row.workflow_type as Workflow['workflowType']) ?? 'explicit',
      trigger: row.trigger ?? '',
      skill: (record.skill as string) ?? null,
      status: (row.status as Workflow['status']) ?? 'active',
      created: (record.created as string) ?? '',
      purpose: row.purpose ?? '',
      filePath: (record.file_path as string) ?? row.markdown_path,
      sections: (row.sections as unknown as WorkflowSection[]) ?? [],
      prerequisites: (row.prerequisites as unknown as string[]) ?? [],
    }

    return NextResponse.json({ data: workflow, cached: false })
  } catch (error) {
    console.error('Error fetching workflow:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch workflow',
        },
      },
      { status: 500 }
    )
  }
}
