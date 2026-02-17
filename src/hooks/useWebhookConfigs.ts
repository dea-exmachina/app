'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { WebhookConfig, TransformConfig } from '@/types/creep'

interface UseWebhookConfigsParams {
  pollInterval?: number // ms, 0 to disable
}

interface UseWebhookConfigsResult {
  configs: WebhookConfig[]
  loading: boolean
  error: string | null
  refresh: () => void
  lastUpdated: Date | null
  createConfig: (data: CreateWebhookData) => Promise<WebhookConfig>
  updateConfig: (id: string, data: UpdateWebhookData) => Promise<WebhookConfig>
  mutating: boolean
  mutationError: string | null
}

export interface CreateWebhookData {
  source: string
  endpoint_path: string
  secret?: string
  enabled?: boolean
  transform_config?: TransformConfig
}

export interface UpdateWebhookData {
  endpoint_path?: string
  secret?: string
  enabled?: boolean
  transform_config?: TransformConfig
}

export function useWebhookConfigs(params: UseWebhookConfigsParams = {}): UseWebhookConfigsResult {
  const [configs, setConfigs] = useState<WebhookConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [mutating, setMutating] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchConfigs = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/creep/webhooks')
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const json = await res.json()
      setConfigs(json.data ?? [])
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchConfigs(true)
  }, [fetchConfigs])

  // Polling
  useEffect(() => {
    const interval = params.pollInterval ?? 30000
    if (interval <= 0) return

    intervalRef.current = setInterval(() => fetchConfigs(false), interval)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchConfigs, params.pollInterval])

  const refresh = useCallback(() => {
    fetchConfigs(true)
  }, [fetchConfigs])

  const createConfig = useCallback(async (data: CreateWebhookData): Promise<WebhookConfig> => {
    setMutating(true)
    setMutationError(null)

    try {
      const res = await fetch('/api/creep/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }

      const json = await res.json()
      const created = json.data as WebhookConfig

      // Optimistic update: prepend to list
      setConfigs((prev) => [created, ...prev])
      setLastUpdated(new Date())

      return created
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setMutationError(message)
      throw err
    } finally {
      setMutating(false)
    }
  }, [])

  const updateConfig = useCallback(async (id: string, data: UpdateWebhookData): Promise<WebhookConfig> => {
    setMutating(true)
    setMutationError(null)

    try {
      const res = await fetch(`/api/creep/webhooks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }

      const json = await res.json()
      const updated = json.data as WebhookConfig

      // Optimistic update: replace in list
      setConfigs((prev) => prev.map((c) => (c.id === id ? updated : c)))
      setLastUpdated(new Date())

      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setMutationError(message)
      throw err
    } finally {
      setMutating(false)
    }
  }, [])

  return {
    configs,
    loading,
    error,
    refresh,
    lastUpdated,
    createConfig,
    updateConfig,
    mutating,
    mutationError,
  }
}
