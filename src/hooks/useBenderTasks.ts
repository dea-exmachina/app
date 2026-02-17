'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { BenderTask } from '@/types/bender'
import { getTasks } from '@/lib/client/api'

const REALTIME_TIMEOUT_MS = 5000

interface UseBenderTasksResult {
  tasks: BenderTask[]
  loading: boolean
  error: string | null
  isLive: boolean
  refresh: () => void
}

export function useBenderTasks(): UseBenderTasksResult {
  const [tasks, setTasks] = useState<BenderTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchTasks = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true)
    setError(null)
    try {
      const res = await getTasks()
      setTasks(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchTasks(true)
  }, [fetchTasks])

  // Polling fallback
  const startPolling = useCallback(() => {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => fetchTasks(false), 10000)
  }, [fetchTasks])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Supabase Realtime subscription on bender_tasks
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!supabaseUrl || !supabaseKey) return

    const supabase = createClient(supabaseUrl, supabaseKey)

    timeoutRef.current = setTimeout(() => {
      if (!isLive) startPolling()
    }, REALTIME_TIMEOUT_MS)

    const channel = supabase
      .channel('bender-tasks-feed')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bender_tasks',
        },
        () => {
          // Re-fetch on any change
          fetchTasks(false)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLive(true)
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
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
  }, [fetchTasks, startPolling, stopPolling])

  const refresh = useCallback(() => {
    fetchTasks(true)
  }, [fetchTasks])

  return { tasks, loading, error, isLive, refresh }
}
