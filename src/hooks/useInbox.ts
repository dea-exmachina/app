'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { InboxItem, InboxCreateRequest } from '@/types/inbox'
import { getInbox, postInbox, deleteInboxItem } from '@/lib/client/api'

const REALTIME_TIMEOUT_MS = 5000

export function useInbox() {
  const [data, setData] = useState<InboxItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mutating, setMutating] = useState(false)
  const [isLive, setIsLive] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchItems = useCallback((isInitial = true) => {
    if (isInitial) setLoading(true)
    setError(null)
    getInbox()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => {
        if (isInitial) setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetchItems(true)
  }, [fetchItems])

  // Polling fallback
  const startPolling = useCallback(() => {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => fetchItems(false), 10000)
  }, [fetchItems])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Supabase Realtime subscription on inbox_items
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!supabaseUrl || !supabaseKey) return

    const supabase = createClient(supabaseUrl, supabaseKey)

    timeoutRef.current = setTimeout(() => {
      if (!isLive) startPolling()
    }, REALTIME_TIMEOUT_MS)

    const channel = supabase
      .channel('inbox-items-feed')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inbox_items',
        },
        () => {
          // Re-fetch on any change (INSERT/UPDATE/DELETE)
          fetchItems(false)
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
  }, [fetchItems, startPolling, stopPolling])

  const create = useCallback(
    async (item: InboxCreateRequest) => {
      setMutating(true)
      try {
        const res = await postInbox(item)
        // Optimistically add to list
        setData((prev) => (prev ? [res.data, ...prev] : [res.data]))
        return res.data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create item'
        setError(message)
        throw err
      } finally {
        setMutating(false)
      }
    },
    []
  )

  const remove = useCallback(
    async (filename: string) => {
      setMutating(true)
      try {
        await deleteInboxItem(filename)
        // Optimistically remove from list
        setData((prev) =>
          prev ? prev.filter((item) => item.filename !== filename) : null
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete item'
        setError(message)
        throw err
      } finally {
        setMutating(false)
      }
    },
    []
  )

  return { data, loading, error, mutating, isLive, create, remove, refetch: fetchItems }
}
