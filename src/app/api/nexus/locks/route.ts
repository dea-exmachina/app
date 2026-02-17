/**
 * NEXUS Locks API — Three-tier locking system
 *
 * GET  /api/nexus/locks?agent=bender+frontend&active_only=true
 * POST /api/nexus/locks  { lock_type, agent, target, card_id?, expires_at? }
 *
 * DEA-042 | Phase 1
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { NexusLockRequest } from '@/types/nexus'

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const agent = params.get('agent')
    const activeOnly = params.get('active_only') !== 'false' // default true
    const lockType = params.get('lock_type')
    const limit = parseInt(params.get('limit') || '100', 10)

    let query = tables.nexus_locks
      .select('*')
      .order('acquired_at', { ascending: false })
      .limit(Math.min(limit, 500))

    if (activeOnly) query = query.is('released_at', null)
    if (agent) query = query.eq('agent', agent)
    if (lockType) query = query.eq('lock_type', lockType)

    const { data, error } = await query
    if (error) {
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, cached: false })
  } catch (error) {
    console.error('GET /api/nexus/locks error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list locks' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: NexusLockRequest = await request.json()

    if (!body.lock_type || !body.agent || !body.target) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'lock_type, agent, and target are required' } },
        { status: 400 }
      )
    }

    // Check for conflicts — active, unexpired locks on same target
    const { data: existing } = await tables.nexus_locks
      .select('*')
      .eq('lock_type', body.lock_type)
      .eq('target', body.target)
      .is('released_at', null)

    const now = new Date()
    const conflicts = (existing ?? []).filter((lock: { agent: string; expires_at: string | null }) => {
      // Expired locks don't count
      if (lock.expires_at && new Date(lock.expires_at) < now) return false
      return true
    })

    if (conflicts.length > 0) {
      const holder = conflicts[0] as { agent: string; id: string }
      // Same agent can extend
      if (holder.agent === body.agent) {
        const defaultExpiry = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString()
        const { data, error } = await tables.nexus_locks
          .update({ expires_at: body.expires_at ?? defaultExpiry })
          .eq('id', holder.id)
          .select()
          .single()

        if (error) {
          return NextResponse.json(
            { error: { code: 'UPDATE_ERROR', message: error.message } },
            { status: 500 }
          )
        }
        return NextResponse.json({ data, cached: false })
      }

      // Different agent — conflict
      return NextResponse.json(
        {
          error: {
            code: 'LOCK_CONFLICT',
            message: `Lock held by ${holder.agent}`,
            conflict: holder,
          },
        },
        { status: 409 }
      )
    }

    // Resolve card_id text → UUID if provided
    let resolvedCardId: string | null = null
    if (body.card_id) {
      const { data: card } = await tables.nexus_cards
        .select('id')
        .eq('card_id', body.card_id)
        .single()
      resolvedCardId = card?.id ?? null
    }

    const defaultExpiry = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString()
    const { data, error } = await tables.nexus_locks
      .insert({
        lock_type: body.lock_type,
        card_id: resolvedCardId,
        agent: body.agent,
        target: body.target,
        expires_at: body.expires_at ?? defaultExpiry,
        metadata: body.metadata ?? {},
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'CREATE_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    // lock event emitted by database trigger
    return NextResponse.json({ data, cached: false }, { status: 201 })
  } catch (error) {
    console.error('POST /api/nexus/locks error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to acquire lock' } },
      { status: 500 }
    )
  }
}
