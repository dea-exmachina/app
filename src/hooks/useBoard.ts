'use client'

import { useState, useEffect } from 'react'
import type { KanbanBoard } from '@/types/kanban'
import { getBoard } from '@/lib/client/api'

export function useBoard(boardId: string) {
  const [data, setData] = useState<KanbanBoard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getBoard(boardId)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [boardId])

  return { data, loading, error }
}
