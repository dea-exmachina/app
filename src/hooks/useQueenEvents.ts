'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { QueenEvent } from '@/types/queen'

interface UseQueenEventsParams {
  type?: string
  source?: string
  limit?: number
  traceId?: string
  pollInterval?: number // ms, 0 to disable
}

interface UseQueenEventsResult {
  events: QueenEvent[]
  loading: boolean
  error: string | null
  refresh: () => void
  lastUpdated: Date | null
}

function buildUrl(params: UseQueenEventsParams): string {
  const url = new URL('/api/queen/events', window.location.origin)
  if (params.type) url.searchParams.set('type', params.type)
  if (params.source) url.searchParams.set('source', params.source)
  if (params.limit) url.searchParams.set('limit', String(params.limit))
  if (params.traceId) url.searchParams.set('trace_id', params.traceId)
  return url.toString()
}

export function useQueenEvents(params: UseQueenEventsParams = {}): UseQueenEventsResult {
  const [events, setEvents] = useState<QueenEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchEvents = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true)
    setError(null)

    try {
      const res = await fetch(buildUrl(params))
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const json = await res.json()
      setEvents(json.data ?? [])
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [params.type, params.source, params.limit, params.traceId])

  // Initial fetch + re-fetch on filter changes
  useEffect(() => {
    fetchEvents(true)
  }, [fetchEvents])

  // Polling
  useEffect(() => {
    const interval = params.pollInterval ?? 10000
    if (interval <= 0) return

    intervalRef.current = setInterval(() => fetchEvents(false), interval)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchEvents, params.pollInterval])

  const refresh = useCallback(() => {
    fetchEvents(true)
  }, [fetchEvents])

  return { events, loading, error, refresh, lastUpdated }
}
