/**
 * Projects API Route (v2)
 *
 * GET /api/projects - List all projects
 * POST /api/projects - Create new project
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables, generateSlug, isValidSlug } from '@/lib/server/database'
import type {
  CreateProjectRequest,
  ProjectListResponse,
  ErrorResponse,
  Project,
} from '@/types/project'

/**
 * GET /api/projects
 * List all projects
 *
 * Query params:
 * - status: Filter by status (active, paused, archived)
 * - type: Filter by type (software, content, life, business, hobby, custom)
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ProjectListResponse | ErrorResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const typeFilter = searchParams.get('type')

    // Build query
    let query = tables.projects
      .select('*')
      .order('created_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    if (typeFilter) {
      query = query.eq('type', typeFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching projects:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch projects',
          details: error.message,
          code: 'DB_ERROR',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      projects: data as Project[],
      total: data.length,
    })
  } catch (error) {
    console.error('Unexpected error fetching projects:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects
 * Create new project
 *
 * Body: CreateProjectRequest
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<Project | ErrorResponse>> {
  try {
    const body: CreateProjectRequest = await request.json()

    // Validate required fields
    if (!body.name || !body.type) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: 'name and type are required',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }

    // Generate slug if not provided
    const slug = body.slug || generateSlug(body.name)

    // Validate slug format
    if (!isValidSlug(slug)) {
      return NextResponse.json(
        {
          error: 'Invalid slug format',
          details: 'Slug must contain only lowercase letters, numbers, and hyphens',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const { data: existing } = await tables.projects
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return NextResponse.json(
        {
          error: 'Project slug already exists',
          details: `A project with slug "${slug}" already exists`,
          code: 'DUPLICATE_SLUG',
        },
        { status: 409 }
      )
    }

    // Create project
    const { data, error} = await tables.projects
      .insert({
        name: body.name,
        slug,
        type: body.type,
        template_id: body.template_id || null,
        status: 'active',
        repo_path: body.repo_path || null,
        git_repo_url: body.git_repo_url || null,
        dashboard_layout: (body.dashboard_layout || null) as any, // JSONB cast
        integrations: (body.integrations || {}) as any, // JSONB cast
        settings: (body.settings || {}) as any, // JSONB cast
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating project:', error)
      return NextResponse.json(
        {
          error: 'Failed to create project',
          details: error.message,
          code: 'DB_ERROR',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(data as Project, { status: 201 })
  } catch (error) {
    console.error('Unexpected error creating project:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
