import { NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { Workflow, WorkflowSection } from '@/types/workflow'

export async function GET(): Promise<
  NextResponse<ApiResponse<Workflow[]> | ApiError>
> {
  try {
    const { data, error } = await tables.workflows
      .select('*')
      .order('title')

    if (error) {
      throw error
    }

    // Map database columns to Workflow interface
    // Handle both old schema (slug, markdown_path) and new schema (name, file_path)
    const workflows: Workflow[] = (data ?? [])
      .filter((row) => row.status === 'active' || row.status === null)
      .map((row) => {
        const record = row as Record<string, unknown>
        return {
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
      })

    return NextResponse.json({ data: workflows, cached: false })
  } catch (error) {
    console.error('Error fetching workflows:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch workflows',
        },
      },
      { status: 500 }
    )
  }
}
