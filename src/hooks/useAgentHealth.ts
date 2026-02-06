'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { AgentHealth } from '@/types/queen'

interface UseAgentHealthParams {
  pollInterval?: number // ms, 0 to disable
}

interface UseAgentHealthResult {
  agents: AgentHealth[]
  stuckAgents: AgentHealth[]
  loading: boolean
  error: string | null
  refresh: () => void
  lastUpdated: Date | null
}

export function useAgentHealth(params: UseAgentHealthParams = {}): UseAgentHealthResult {
  const [agents, setAgents] = useState<AgentHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchAgents = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/queen/agents')
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const json = await res.json()
      setAgents(json.data ?? [])
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchAgents(true)
  }, [fetchAgents])

  // Polling
  useEffect(() => {
    const interval = params.pollInterval ?? 10000
    if (interval <= 0) return

    intervalRef.current = setInterval(() => fetchAgents(false), interval)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchAgents, params.pollInterval])

  const refresh = useCallback(() => {
    fetchAgents(true)
  }, [fetchAgents])

  // Derive stuck agents from current data
  const stuckAgents = agents.filter((a) => a.status === 'stuck')

  return { agents, stuckAgents, loading, error, refresh, lastUpdated }
}
