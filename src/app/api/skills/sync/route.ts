/**
 * Skills Sync API
 *
 * POST /api/skills/sync — fetch dea-skilllist.md from vault, parse, upsert to Supabase.
 * Deletes skills no longer present in the markdown (orphan cleanup).
 *
 * CC-109 | Skills Auto-Sync
 *
 * Protected by CRON_SECRET when called by Vercel Cron.
 * Also callable manually from the Skills UI (no secret required for manual calls —
 * endpoint is internal-only, auth handled by deployment scope).
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import { fetchVaultFile } from '@/lib/server/github'
import { parseSkillsMarkdown } from '@/lib/server/skills-parser'

export async function POST(request: NextRequest) {
  try {
    // Allow cron calls (with secret) and manual UI calls (no secret needed)
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')
    if (authHeader && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' } },
        { status: 401 }
      )
    }

    // Fetch markdown from vault
    const content = await fetchVaultFile('tools/dea-skilllist.md')
    if (!content) {
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: 'Could not fetch dea-skilllist.md from vault' } },
        { status: 502 }
      )
    }

    // Parse markdown → skills
    const parsed = parseSkillsMarkdown(content)
    if (parsed.length === 0) {
      return NextResponse.json(
        { error: { code: 'PARSE_ERROR', message: 'No skills parsed from markdown — check format' } },
        { status: 422 }
      )
    }

    // Upsert all parsed skills
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertError } = await (tables.skills as any).upsert(
      parsed.map((s) => ({
        name: s.name,
        description: s.description,
        category: s.category,
        workflow: s.workflow,
        status: s.status,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'name' }
    )

    if (upsertError) {
      console.error('skills sync: upsert error', upsertError)
      return NextResponse.json(
        { error: { code: 'UPSERT_ERROR', message: upsertError.message } },
        { status: 500 }
      )
    }

    // Delete orphans: skills in DB but not in parsed list
    const parsedNames = parsed.map((s) => s.name)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: deletedRows, error: deleteError } = await (tables.skills as any)
      .delete()
      .not('name', 'in', `(${parsedNames.map((n) => `"${n}"`).join(',')})`)
      .select('name')

    if (deleteError) {
      // Non-fatal — log but don't fail the sync
      console.warn('skills sync: orphan delete error', deleteError)
    }

    const deleted = deletedRows?.length ?? 0

    return NextResponse.json({
      data: {
        synced: parsed.length,
        deleted,
        timestamp: new Date().toISOString(),
      },
      cached: false,
    })
  } catch (error) {
    console.error('POST /api/skills/sync error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Sync failed' } },
      { status: 500 }
    )
  }
}
