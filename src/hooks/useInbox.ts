'use client'

import { useState, useEffect, useCallback } from 'react'
import type { InboxItem, InboxCreateRequest } from '@/types/inbox'
import { getInbox, postInbox, deleteInboxItem } from '@/lib/client/api'

export function useInbox() {
  const [data, setData] = useState<InboxItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mutating, setMutating] = useState(false)

  const fetchItems = useCallback(() => {
    setLoading(true)
    setError(null)
    getInbox()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

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

  return { data, loading, error, mutating, create, remove, refetch: fetchItems }
}
