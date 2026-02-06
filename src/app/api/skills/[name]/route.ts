import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { Skill, SkillDetail } from '@/types/skill'
import type { Workflow, WorkflowSection } from '@/types/workflow'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
): Promise<NextResponse<ApiResponse<SkillDetail> | ApiError>> {
  try {
    const { name } = await params

    // Query skill from Supabase
    const { data: skill, error: skillError } = await tables.skills
      .select('name, description, category, workflow, status')
      .eq('name', name)
      .single()

    if (skillError || !skill) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `Skill '${name}' not found`,
          },
        },
        { status: 404 }
      )
    }

    // Query linked workflow if exists
    let linkedWorkflow: Workflow | null = null
    if (skill.workflow) {
      // Workflow name is stored as filename (e.g., "template-creation.md")
      // Extract name without extension for lookup by slug
      const workflowSlug = skill.workflow.replace('.md', '')

      const { data: workflow } = await tables.workflows
        .select('*')
        .eq('slug', workflowSlug)
        .single()

      if (workflow) {
        // Map database columns to Workflow interface
        // Handle both old schema (slug, markdown_path) and new schema (name, file_path)
        const record = workflow as Record<string, unknown>
        linkedWorkflow = {
          name: (record.name as string) ?? workflow.slug,
          title: workflow.title,
          workflowType: (workflow.workflow_type as Workflow['workflowType']) ?? 'explicit',
          trigger: workflow.trigger ?? '',
          skill: (record.skill as string) ?? null,
          status: (workflow.status as Workflow['status']) ?? 'active',
          created: (record.created as string) ?? '',
          purpose: workflow.purpose ?? '',
          filePath: (record.file_path as string) ?? workflow.markdown_path,
          sections: (workflow.sections as unknown as WorkflowSection[]) ?? [],
          prerequisites: (workflow.prerequisites as unknown as string[]) ?? [],
        }
      }
    }

    const detail: SkillDetail = {
      ...(skill as unknown as Skill),
      linkedWorkflow,
    }

    return NextResponse.json({ data: detail, cached: false })
  } catch (error) {
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
