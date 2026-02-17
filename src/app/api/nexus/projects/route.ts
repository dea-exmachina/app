/**
 * NEXUS Projects API — List projects
 *
 * GET /api/nexus/projects
 *
 * DEA-042 | Phase 1
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

export async function GET(_request: NextRequest) {
  try {
    const { data, error } = await tables.nexus_projects
      .select('*')
      .order('name')

    if (error) {
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, cached: false })
  } catch (error) {
    console.error('GET /api/nexus/projects error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list projects' } },
      { status: 500 }
    )
  }
}
