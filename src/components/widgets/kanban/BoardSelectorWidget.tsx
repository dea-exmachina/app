'use client'

import { useState, useEffect } from 'react'
import { BoardSelector } from '@/components/kanban/BoardSelector'
import { Skeleton } from '@/components/ui/skeleton'
import { getBoards } from '@/lib/client/api'
import type { BoardSummary } from '@/types/kanban'

export function BoardSelectorWidget() {
  const [boards, setBoards] = useState<BoardSummary[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getBoards()
      .then((res) => setBoards(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error || !boards) {
    return (
      <div className="text-sm text-destructive">
        Failed to load boards: {error || 'Unknown error'}
      </div>
    )
  }

  return <BoardSelector boards={boards} />
}
