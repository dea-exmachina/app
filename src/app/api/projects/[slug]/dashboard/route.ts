/**
 * Project Dashboard API Route
 *
 * GET /api/projects/:slug/dashboard - Returns all widget data in one call
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ProjectDashboardData, ProjectNotes, ProjectLink } from '@/types/project'
import type { NexusCard, NexusProject } from '@/types/nexus'
import type { ErrorResponse } from '@/types/project'

const DEFAULT_NOTES: ProjectNotes = { checklist: [], freeform: '' }

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse<{ data: ProjectDashboardData; cached: boolean } | ErrorResponse>> {
  try {
    const { slug } = await params

    // Detect UUID vs slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
    const column = isUuid ? 'id' : 'slug'

    // 1. Fetch project
    const { data: project, error: projectError } = await tables.projects
      .select('*')
      .eq(column, slug)
      .single()

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Project not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to fetch project', details: projectError.message, code: 'DB_ERROR' },
        { status: 500 }
      )
    }

    // 2. Fetch template
    let template = null
    if (project.template_id) {
      const { data: templateData } = await tables.project_templates
        .select('*')
        .eq('id', project.template_id)
        .single()
      template = templateData
    }

    // 3. Match nexus_project by slug
    const { data: nexusProject } = await tables.nexus_projects
      .select('*')
      .eq('slug', project.slug)
      .maybeSingle() as { data: NexusProject | null }

    // 4. Aggregate cards by lane (if nexus project exists)
    let cardsByLane: Record<string, number> = {}
    let totalCards = 0
    let completionPct = 0
    let openCards: NexusCard[] = []
    let lastCardActivity: string | null = null

    if (nexusProject) {
      // Cards by lane — manual aggregation via Supabase client
      const { data: allCards } = await tables.nexus_cards
        .select('lane')
        .eq('project_id', nexusProject.id) as { data: Array<{ lane: string }> | null }

      if (allCards) {
        for (const card of allCards) {
          cardsByLane[card.lane] = (cardsByLane[card.lane] || 0) + 1
          totalCards++
        }
      }

      const doneCount = cardsByLane['done'] || 0
      completionPct = totalCards > 0 ? Math.round((doneCount / totalCards) * 100) : 0

      // Open cards (not done), ordered by priority
      const { data: openCardsData } = await tables.nexus_cards
        .select('*')
        .eq('project_id', nexusProject.id)
        .neq('lane', 'done')
        .order('created_at', { ascending: false })
        .limit(50) as { data: NexusCard[] | null }

      if (openCardsData) {
        // Sort by priority in JS since we can't use CASE in Supabase client
        const priorityOrder: Record<string, number> = {
          critical: 0, high: 1, normal: 2, low: 3,
        }
        openCards = openCardsData.sort(
          (a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
        )
      }

      // Last card activity
      const { data: latestCard } = await tables.nexus_cards
        .select('updated_at')
        .eq('project_id', nexusProject.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (latestCard) {
        lastCardActivity = (latestCard as { updated_at: string }).updated_at
      }
    }

    // 5. Fetch team members
    const { data: projectBenders } = await tables.project_benders
      .select('identity_id, role, status')
      .eq('project_id', project.id) as {
        data: Array<{ identity_id: string; role: string | null; status: string | null }> | null
      }

    const teamMembers = []
    if (projectBenders && projectBenders.length > 0) {
      const identityIds = projectBenders.map((pb) => pb.identity_id)
      const { data: identities } = await tables.bender_identities
        .select('id, slug, display_name, expertise')
        .in('id', identityIds) as {
          data: Array<{
            id: string; slug: string; display_name: string; expertise: string[]
          }> | null
        }

      if (identities) {
        for (const pb of projectBenders) {
          const identity = identities.find((i) => i.id === pb.identity_id)
          if (identity) {
            teamMembers.push({
              identity_id: identity.id,
              slug: identity.slug,
              display_name: identity.display_name,
              role: pb.role,
              status: pb.status,
              expertise: identity.expertise || [],
            })
          }
        }
      }
    }

    // 6. Extract notes from settings
    const settings = (project.settings || {}) as Record<string, unknown>
    const notes: ProjectNotes = (settings.notes as ProjectNotes) || DEFAULT_NOTES
    const links: ProjectLink[] = (settings.links as ProjectLink[]) || []

    const dashboardData: ProjectDashboardData = {
      project,
      template,
      nexusProject,
      cardsByLane,
      totalCards,
      completionPct,
      openCards,
      teamMembers,
      notes,
      links,
      lastCardActivity,
      benderCount: projectBenders?.length || 0,
    }

    return NextResponse.json({ data: dashboardData, cached: false })
  } catch (error) {
    console.error('Unexpected error fetching project dashboard:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
