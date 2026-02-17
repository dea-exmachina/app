/**
 * NEXUS Lock Release API
 *
 * DELETE /api/nexus/locks/[lockId]  — release a lock
 *
 * DEA-042 | Phase 1
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ lockId: string }> }
) {
  try {
    const { lockId } = await params

    const { data, error } = await tables.nexus_locks
      .update({ released_at: new Date().toISOString() })
      .eq('id', lockId)
      .is('released_at', null)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: `Lock not found or already released: ${lockId}` } },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: { code: 'UPDATE_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    // lock.released event emitted by database trigger
    return NextResponse.json({ data, cached: false })
  } catch (error) {
    console.error('DELETE /api/nexus/locks/[lockId] error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to release lock' } },
      { status: 500 }
    )
  }
}
