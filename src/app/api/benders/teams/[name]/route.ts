import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { BenderTeam, BenderAgent } from '@/types/bender'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
): Promise<NextResponse<ApiResponse<BenderTeam> | ApiError>> {
  try {
    const { name } = await params

    const { data: row, error } = await tables.bender_teams
      .select('*')
      .eq('name', name)
      .single()

    if (error || !row) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `Team '${name}' not found`,
          },
        },
        { status: 404 }
      )
    }

    // Fetch members for this team from junction table
    const [membersRes, identitiesRes] = await Promise.all([
      tables.bender_team_members.select('*').eq('team_id', row.id),
      tables.bender_identities.select('id, display_name, slug'),
    ])

    const identityMap = new Map(
      (identitiesRes.data ?? []).map((i: { id: string; display_name: string | null; slug: string }) => [i.id, i])
    )

    const members: BenderAgent[] = (membersRes.data ?? []).map((m: Record<string, unknown>) => {
      const identity = identityMap.get(m.identity_id as string) as { display_name: string | null; slug: string } | undefined
      return {
        name: identity?.display_name ?? 'Unknown',
        role: (m.role as string) ?? '',
        platform: (m.platform as string) ?? '',
        invocation: identity?.slug ? `bender+${identity.slug}` : '',
        team: name,
      }
    })

    const team: BenderTeam = {
      name: row.name,
      members,
      sequencing: row.sequencing ?? '',
      fileOwnership: ((row as Record<string, unknown>).file_ownership as BenderTeam['fileOwnership']) ?? {},
      branchStrategy: row.branch_strategy ?? '',
    }

    return NextResponse.json({ data: team, cached: false })
  } catch (error) {
    console.error('Error fetching team:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch team',
        },
      },
      { status: 500 }
    )
  }
}
