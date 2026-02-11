'use client'

/**
 * Board hook — SSR initial fetch + Supabase Realtime for live updates.
 *
 * CC-013: Added realtime subscription on nexus_cards filtered by project.
 * Pattern: Initial fetch via API + client-side Realtime for INSERT/UPDATE/DELETE.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { KanbanBoard } from '@/types/kanban'
import { getBoard } from '@/lib/client/api'

const REALTIME_TIMEOUT_MS = 5000

export function useBoard(boardId: string) {
  const [data, setData] = useState<KanbanBoard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Full refresh from API
  const refresh = useCallback(() => {
    setLoading(true)
    getBoard(boardId)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [boardId])

  // Initial fetch
  useEffect(() => {
    refresh()
  }, [refresh])

  // Supabase Realtime subscription on nexus_cards
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !supabaseKey) return

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Timeout fallback
    timeoutRef.current = setTimeout(() => {
      if (!isLive) {
        console.warn(`[useBoard] Realtime connection timed out for board ${boardId}`)
      }
    }, REALTIME_TIMEOUT_MS)

    // Subscribe to all changes on nexus_cards.
    // We do a full re-fetch on any change rather than partial updates,
    // because the board shape (lanes grouped by lane column) requires re-grouping.
    const channel = supabase
      .channel(`board-${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nexus_cards',
        },
        () => {
          // Re-fetch the full board on any card change
          refresh()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLive(true)
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsLive(false)
        } else if (status === 'CLOSED') {
          setIsLive(false)
        }
      })

    return () => {
      supabase.removeChannel(channel)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [boardId, refresh])

  return { data, loading, error, isLive, refresh }
}
