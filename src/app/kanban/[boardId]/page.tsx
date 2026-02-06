'use client'

import { use } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { BoardView } from '@/components/kanban/BoardView'
import { useBoard } from '@/hooks/useBoard'

export default function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>
}) {
  const { boardId } = use(params)
  const { data: board, loading, error } = useBoard(boardId)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/kanban"
            className="font-mono text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to boards
          </Link>
        </div>
        <div className="text-sm text-muted-foreground">Loading board...</div>
      </div>
    )
  }

  if (error || !board) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/kanban"
            className="font-mono text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to boards
          </Link>
        </div>
        <div className="text-sm text-destructive">
          Failed to load board: {error || 'Unknown error'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/kanban"
          className="font-mono text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to boards
        </Link>
      </div>
      <BoardView board={board} />
    </div>
  )
}
