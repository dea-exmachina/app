import { NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { BenderTeam, BenderAgent } from '@/types/bender'

/** Parse legacy JSONB members column as fallback (e.g. The Council) */
function parseLegacyMembers(raw: unknown): BenderAgent[] {
  const arr = Array.isArray(raw) ? raw : []
  return arr.map((m: { name?: string; role?: string }) => ({
    name: m.name ?? 'Unknown',
    role: m.role ?? '',
    platform: '',
    invocation: '',
    team: null,
  }))
}

export async function GET(): Promise<
  NextResponse<ApiResponse<BenderTeam[]> | ApiError>
> {
  try {
    // Fetch teams, members, and identities in parallel
    const [teamsRes, membersRes, identitiesRes] = await Promise.all([
      tables.bender_teams.select('*').order('name'),
      tables.bender_team_members.select('*'),
      tables.bender_identities.select('id, display_name, slug'),
    ])

    if (teamsRes.error) throw teamsRes.error
    if (membersRes.error) throw membersRes.error
    if (identitiesRes.error) throw identitiesRes.error

    // Build identity lookup
    const identityMap = new Map(
      (identitiesRes.data ?? []).map((i: { id: string; display_name: string | null; slug: string }) => [i.id, i])
    )

    // Group members by team_id from junction table
    const membersByTeam = new Map<string, BenderAgent[]>()
    for (const m of membersRes.data ?? []) {
      const row = m as { team_id: string; identity_id: string; role: string; platform: string }
      const identity = identityMap.get(row.identity_id) as { display_name: string | null; slug: string } | undefined
      const agent: BenderAgent = {
        name: identity?.display_name ?? row.role ?? 'Unknown',
        role: row.role ?? '',
        platform: row.platform ?? '',
        invocation: identity?.slug ? `bender+${identity.slug}` : '',
        team: null,
      }
      const list = membersByTeam.get(row.team_id) ?? []
      list.push(agent)
      membersByTeam.set(row.team_id, list)
    }

    const teams: BenderTeam[] = (teamsRes.data ?? []).map((row) => {
      const r = row as Record<string, unknown>
      const junctionMembers = membersByTeam.get(row.id as string) ?? []
      return {
        name: row.name as string,
        // Use junction table members; fall back to legacy JSONB (e.g. The Council)
        members: junctionMembers.length > 0 ? junctionMembers : parseLegacyMembers(r.members),
        sequencing: (row.sequencing as string) ?? '',
        fileOwnership: (r.file_ownership as BenderTeam['fileOwnership']) ?? {},
        branchStrategy: (row.branch_strategy as string) ?? '',
      }
    })

    return NextResponse.json({ data: teams, cached: false })
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch bender teams',
        },
      },
      { status: 500 }
    )
  }
}
