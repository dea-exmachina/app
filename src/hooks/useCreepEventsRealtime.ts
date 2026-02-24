'use client'

/**
 * Event feed hook — subscribes to nexus_events via Supabase Realtime.
 *
 * CC-014: Redirected from queen_events (0 rows) to nexus_events (real data).
 * Maps nexus_events to CreepEvent shape for backward-compatible rendering.
 *
 * CC-129: Fixed stale closure bug — isLiveRef tracks current subscription state
 * so the timeout callback reads the real value, not the captured render-time value.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { CreepEvent } from '@/types/creep'
import type { NexusEvent } from '@/types/nexus'

const MAX_EVENTS = 200
const REALTIME_TIMEOUT_MS = 5000

interface UseCreepEventsRealtimeParams {
  type?: string
  source?: string
  limit?: number
  traceId?: string
  pollInterval?: number // fallback polling interval in ms, 0 to disable
}

interface UseCreepEventsRealtimeResult {
  events: CreepEvent[]
  loading: boolean
  error: string | null
  isLive: boolean
  refresh: () => void
  lastUpdated: Date | null
}

/**
 * Map nexus_events row to CreepEvent shape for backward-compatible rendering.
 * nexus_events: event_type, card_id, actor, payload, created_at
 * CreepEvent:   type, source, actor, summary, payload, trace_id, project, processed
 */
function nexusToCreep(ne: NexusEvent): CreepEvent {
  const payload = (ne.payload ?? {}) as Record<string, unknown>
  return {
    id: ne.id,
    type: ne.event_type,
    source: 'nexus',
    actor: ne.actor,
    summary: (payload.summary as string)
      || (payload.comment as string)
      || `${ne.event_type} by ${ne.actor}`,
    payload,
    trace_id: null,
    project: null,
    processed: true,
    created_at: ne.created_at,
  }
}

function buildUrl(params: UseCreepEventsRealtimeParams): string {
  // CC-014: Use nexus events API instead of creep events
  const url = new URL('/api/nexus/events', window.location.origin)
  if (params.type) url.searchParams.set('type', params.type)
  if (params.limit) url.searchParams.set('limit', String(params.limit))
  return url.toString()
}

function matchesFilters(event: CreepEvent, params: UseCreepEventsRealtimeParams): boolean {
  if (params.type && !event.type.startsWith(params.type)) return false
  if (params.source && event.source !== params.source) return false
  return true
}

export function useCreepEventsRealtime(
  params: UseCreepEventsRealtimeParams = {}
): UseCreepEventsRealtimeResult {
  const [events, setEvents] = useState<CreepEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const eventIdsRef = useRef<Set<string>>(new Set())
  // Ref mirrors isLive state so timeout callbacks read the current value,
  // not the stale closure value captured at effect-run time.
  const isLiveRef = useRef(false)

  // Memoize params to prevent unnecessary re-renders
  const paramsKey = useMemo(
    () => JSON.stringify([params.type, params.source, params.limit, params.traceId]),
    [params.type, params.source, params.limit, params.traceId]
  )

  // Fetch events via API (nexus_events)
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
      // Map nexus_events to CreepEvent shape
      const rawData = (json.data ?? []) as NexusEvent[]
      const data = rawData.map(nexusToCreep)
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

  // Supabase Realtime subscription — nexus_events
  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )

    // Set up a timeout - if not connected in 5s, fall back to polling.
    // Uses isLiveRef (not isLive state) to read the current connection state —
    // the state value captured at closure creation is always false on first run.
    timeoutRef.current = setTimeout(() => {
      if (!isLiveRef.current) {
        console.warn('[useCreepEventsRealtime] Realtime connection timed out, falling back to polling')
        startPolling()
      }
    }, REALTIME_TIMEOUT_MS)

    const channel = supabase
      .channel('nexus-events-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'nexus_events',
        },
        (payload) => {
          const rawEvent = payload.new as NexusEvent
          const newEvent = nexusToCreep(rawEvent)

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
          isLiveRef.current = true
          setIsLive(true)
          // Clear timeout since we connected
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
          // Stop polling if it was running
          stopPolling()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          isLiveRef.current = false
          setIsLive(false)
          startPolling()
        } else if (status === 'CLOSED') {
          isLiveRef.current = false
          setIsLive(false)
        }
      })

    return () => {
      isLiveRef.current = false
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
