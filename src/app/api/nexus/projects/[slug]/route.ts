import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

/**
 * PATCH /api/nexus/projects/[slug] — Update project color
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { color } = body as { color: string | null }

    const { data, error } = await tables.nexus_projects
      .update({ color })
      .eq('slug', slug)
      .select('id, slug, name, color')
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'UPDATE_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, cached: false })
  } catch (error) {
    console.error('PATCH /api/nexus/projects/[slug] error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update project' } },
      { status: 500 }
    )
  }
}
