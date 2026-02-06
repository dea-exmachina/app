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

    // Map database columns to BenderTeam interface
    // Note: members and file_ownership added via migration 008
    const team: BenderTeam = {
      name: row.name,
      members: ((row as Record<string, unknown>).members as BenderAgent[]) ?? [],
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
