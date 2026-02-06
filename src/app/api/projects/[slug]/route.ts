/**
 * Single Project API Route (v2)
 *
 * GET /api/projects/:slug - Get project detail
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type {
  ProjectDetailResponse,
  ErrorResponse,
} from '@/types/project'

/**
 * GET /api/projects/:slug
 * Get single project with aggregated counts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse<ProjectDetailResponse | ErrorResponse>> {
  try {
    const { slug } = await params

    // Fetch project
    const { data: project, error: projectError } = await tables.projects
      .select('*')
      .eq('slug', slug)
      .single()

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        // Not found
        return NextResponse.json(
          {
            error: 'Project not found',
            details: `No project found with slug "${slug}"`,
            code: 'NOT_FOUND',
          },
          { status: 404 }
        )
      }

      console.error('Error fetching project:', projectError)
      return NextResponse.json(
        {
          error: 'Failed to fetch project',
          details: projectError.message,
          code: 'DB_ERROR',
        },
        { status: 500 }
      )
    }

    // Fetch template if exists
    let template = null
    if (project.template_id) {
      const { data: templateData } = await tables.project_templates
        .select('*')
        .eq('id', project.template_id)
        .single()
      template = templateData
    }

    // Count benders
    const { count: benderCount } = await tables.project_benders
      .select('*', { count: 'exact', head: true })
      .eq('project_id', project.id)

    // Count kanban cards
    const { count: cardCount } = await tables.kanban_cards
      .select('*', { count: 'exact', head: true })
      .eq('project_id', project.id)

    const response: ProjectDetailResponse = {
      ...project,
      template,
      bender_count: benderCount || 0,
      card_count: cardCount || 0,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Unexpected error fetching project:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
