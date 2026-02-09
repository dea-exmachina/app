'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { CardCommentSummary } from '@/types/nexus'
import { getUnresolvedComments } from '@/lib/client/api'

const REALTIME_TIMEOUT_MS = 5000

interface UseUnresolvedCommentsParams {
  projectId?: string
  pollInterval?: number
}

interface UseUnresolvedCommentsResult {
  unresolvedMap: Map<string, CardCommentSummary>
  loading: boolean
  error: string | null
  refresh: () => void
  totalUnresolved: number
  cardsNeedingAttention: number
}

export function useUnresolvedComments(
  params: UseUnresolvedCommentsParams = {}
): UseUnresolvedCommentsResult {
  const [summaries, setSummaries] = useState<CardCommentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { projectId, pollInterval = 15000 } = params
  const paramsKey = useMemo(() => projectId ?? 'all', [projectId])

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true)
    setError(null)

    try {
      const { data } = await getUnresolvedComments(projectId)
      setSummaries(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [projectId])

  const startPolling = useCallback(() => {
    if (pollInterval <= 0 || intervalRef.current) return
    intervalRef.current = setInterval(() => fetchData(false), pollInterval)
  }, [fetchData, pollInterval])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchData(true)
  }, [fetchData])

  // Realtime: listen for comment inserts/updates to trigger refetch
  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )

    timeoutRef.current = setTimeout(() => {
      startPolling()
    }, REALTIME_TIMEOUT_MS)

    const channel = supabase
      .channel(`unresolved-comments-${paramsKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nexus_comments',
        },
        () => {
          // Any comment change: refetch counts
          fetchData(false)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
          stopPolling()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          startPolling()
        }
      })

    return () => {
      supabase.removeChannel(channel)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      stopPolling()
    }
  }, [paramsKey])

  // Derived values
  const unresolvedMap = useMemo(() => {
    const map = new Map<string, CardCommentSummary>()
    for (const s of summaries) {
      map.set(s.card_display_id, s)
    }
    return map
  }, [summaries])

  const totalUnresolved = useMemo(
    () => summaries.reduce((sum, s) => sum + s.unresolved_count, 0),
    [summaries]
  )

  const cardsNeedingAttention = useMemo(
    () => summaries.filter((s) => s.has_questions || s.has_rejections).length,
    [summaries]
  )

  const refresh = useCallback(() => {
    fetchData(true)
  }, [fetchData])

  return { unresolvedMap, loading, error, refresh, totalUnresolved, cardsNeedingAttention }
}
