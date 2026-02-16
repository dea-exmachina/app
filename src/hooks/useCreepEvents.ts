'use client'

/**
 * Event feed hook — fetches nexus_events via API with optional polling.
 *
 * CC-014: Redirected from queen_events to nexus_events.
 * Maps nexus_events to CreepEvent shape for backward-compatible rendering.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { CreepEvent } from '@/types/creep'
import type { NexusEvent } from '@/types/nexus'

interface UseCreepEventsParams {
  type?: string
  source?: string
  limit?: number
  traceId?: string
  pollInterval?: number // ms, 0 to disable
}

interface UseCreepEventsResult {
  events: CreepEvent[]
  loading: boolean
  error: string | null
  refresh: () => void
  lastUpdated: Date | null
}

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

function buildUrl(params: UseCreepEventsParams): string {
  const url = new URL('/api/nexus/events', window.location.origin)
  if (params.type) url.searchParams.set('type', params.type)
  if (params.limit) url.searchParams.set('limit', String(params.limit))
  return url.toString()
}

export function useCreepEvents(params: UseCreepEventsParams = {}): UseCreepEventsResult {
  const [events, setEvents] = useState<CreepEvent[]>([])
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
      const rawData = (json.data ?? []) as NexusEvent[]
      setEvents(rawData.map(nexusToCreep))
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
