'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { BoardSelector } from '@/components/kanban/BoardSelector'
import type { BoardSummary } from '@/types/kanban'
import { getBoards } from '@/lib/client/api'

export default function KanbanPage() {
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
      <div className="space-y-6">
        <Header
          title="Kanban"
          description="Visual boards parsed from markdown"
        />
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error || !boards) {
    return (
      <div className="space-y-6">
        <Header
          title="Kanban"
          description="Visual boards parsed from markdown"
        />
        <div className="text-sm text-destructive">
          Failed to load boards: {error || 'Unknown error'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Header title="Kanban" description="Visual boards parsed from markdown" />
      <BoardSelector boards={boards} />
    </div>
  )
}
