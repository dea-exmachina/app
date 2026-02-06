/**
 * Templates API Route
 *
 * GET /api/templates - List all project templates
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ProjectTemplate } from '@/types/project'
import type { ErrorResponse } from '@/types/project'

interface TemplateListResponse {
  templates: ProjectTemplate[]
  total: number
}

/**
 * GET /api/templates
 * List all project templates
 *
 * Query params:
 * - project_type: Filter by project type (software, content, life, etc.)
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<TemplateListResponse | ErrorResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const typeFilter = searchParams.get('project_type')

    // Build query
    let query = tables.project_templates
      .select('*')
      .order('created_at', { ascending: true })

    if (typeFilter) {
      query = query.eq('project_type', typeFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch templates',
          details: error.message,
          code: 'DB_ERROR',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      templates: data as ProjectTemplate[],
      total: data.length,
    })
  } catch (error) {
    console.error('Unexpected error fetching templates:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
