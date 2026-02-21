'use client'

/**
 * Dashboard hook — one-shot fetch + Supabase Realtime for live updates.
 *
 * CC-110: Added Realtime subscription on nexus_cards + polling fallback.
 * Pattern mirrors useBoard: initial fetch → subscribe → polling if Realtime fails.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { DashboardSummary } from '@/types/dashboard'
import { getDashboardSummary } from '@/lib/client/api'

const REALTIME_TIMEOUT_MS = 5000
const POLLING_INTERVAL_MS = 30_000

export function useDashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(() => {
    getDashboardSummary()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

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

    function startPolling() {
      if (pollingRef.current) return
      pollingRef.current = setInterval(refresh, POLLING_INTERVAL_MS)
    }

    function stopPolling() {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }

    // Timeout fallback: if Realtime doesn't connect, start polling
    timeoutRef.current = setTimeout(() => {
      if (!isLive) {
        console.warn('[useDashboard] Realtime connection timed out — starting polling fallback')
        startPolling()
      }
    }, REALTIME_TIMEOUT_MS)

    const channel = supabase
      .channel('dashboard-summary')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nexus_cards' },
        () => {
          refresh()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLive(true)
          stopPolling()
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsLive(false)
          startPolling()
        } else if (status === 'CLOSED') {
          setIsLive(false)
        }
      })

    return () => {
      supabase.removeChannel(channel)
      stopPolling()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh])

  return { data, loading, error, isLive, refresh }
}
