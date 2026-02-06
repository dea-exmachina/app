'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { QueenEvent } from '@/types/queen'

const MAX_EVENTS = 200
const REALTIME_TIMEOUT_MS = 5000

interface UseQueenEventsRealtimeParams {
  type?: string
  source?: string
  limit?: number
  traceId?: string
  pollInterval?: number // fallback polling interval in ms, 0 to disable
}

interface UseQueenEventsRealtimeResult {
  events: QueenEvent[]
  loading: boolean
  error: string | null
  isLive: boolean
  refresh: () => void
  lastUpdated: Date | null
}

function buildUrl(params: UseQueenEventsRealtimeParams): string {
  const url = new URL('/api/queen/events', window.location.origin)
  if (params.type) url.searchParams.set('type', params.type)
  if (params.source) url.searchParams.set('source', params.source)
  if (params.limit) url.searchParams.set('limit', String(params.limit))
  if (params.traceId) url.searchParams.set('trace_id', params.traceId)
  return url.toString()
}

function matchesFilters(event: QueenEvent, params: UseQueenEventsRealtimeParams): boolean {
  if (params.type && !event.type.startsWith(params.type)) return false
  if (params.source && event.source !== params.source) return false
  if (params.traceId && event.trace_id !== params.traceId) return false
  return true
}

export function useQueenEventsRealtime(
  params: UseQueenEventsRealtimeParams = {}
): UseQueenEventsRealtimeResult {
  const [events, setEvents] = useState<QueenEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const eventIdsRef = useRef<Set<string>>(new Set())

  // Memoize params to prevent unnecessary re-renders
  const paramsKey = useMemo(
    () => JSON.stringify([params.type, params.source, params.limit, params.traceId]),
    [params.type, params.source, params.limit, params.traceId]
  )

  // Fetch events via API
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
      const data = (json.data ?? []) as QueenEvent[]
      setEvents(data)
      // Update ID set for de-duplication
      eventIdsRef.current = new Set(data.map((e) => e.id))
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [paramsKey])

  // Initial fetch + re-fetch on filter changes
  useEffect(() => {
    fetchEvents(true)
  }, [fetchEvents])

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )

    // Set up a timeout - if not connected in 5s, fall back to polling
    timeoutRef.current = setTimeout(() => {
      if (!isLive) {
        console.warn('[useQueenEventsRealtime] Realtime connection timed out, falling back to polling')
        startPolling()
      }
    }, REALTIME_TIMEOUT_MS)

    const channel = supabase
      .channel('queen-events-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'queen_events',
        },
        (payload) => {
          const newEvent = payload.new as QueenEvent

          // De-duplicate: skip if we already have this event
          if (eventIdsRef.current.has(newEvent.id)) return

          // Check if event matches current filters
          if (!matchesFilters(newEvent, params)) return

          // Add to ID set
          eventIdsRef.current.add(newEvent.id)

          // Prepend event, cap at MAX_EVENTS
          setEvents((prev) => {
            const updated = [newEvent, ...prev]
            if (updated.length > MAX_EVENTS) {
              // Remove oldest events from set
              const removed = updated.slice(MAX_EVENTS)
              removed.forEach((e) => eventIdsRef.current.delete(e.id))
              return updated.slice(0, MAX_EVENTS)
            }
            return updated
          })
          setLastUpdated(new Date())
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLive(true)
          // Clear timeout since we connected
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
          // Stop polling if it was running
          stopPolling()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsLive(false)
          startPolling()
        } else if (status === 'CLOSED') {
          setIsLive(false)
        }
      })

    return () => {
      supabase.removeChannel(channel)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      stopPolling()
    }
  }, [paramsKey])

  // Polling functions
  const startPolling = useCallback(() => {
    const interval = params.pollInterval ?? 10000
    if (interval <= 0 || intervalRef.current) return

    intervalRef.current = setInterval(() => fetchEvents(false), interval)
  }, [fetchEvents, params.pollInterval])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const refresh = useCallback(() => {
    fetchEvents(true)
  }, [fetchEvents])

  return { events, loading, error, isLive, refresh, lastUpdated }
}
