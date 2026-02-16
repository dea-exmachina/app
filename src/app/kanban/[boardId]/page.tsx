'use client'

import { useState, use } from 'react'
import { startOfWeek, endOfWeek } from 'date-fns'
import { BoardView } from '@/components/kanban/BoardView'
import { useBoard } from '@/hooks/useBoard'

export default function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>
}) {
  const { boardId } = use(params)

  const [dateFilter, setDateFilter] = useState<{ start?: Date; end?: Date }>(() => {
    const now = new Date()
    return {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    }
  })

  const { data: board, loading, error } = useBoard(boardId, dateFilter)

  if (loading) {
    return (
      <div className="p-4">
        <div className="font-mono text-[11px] text-terminal-fg-tertiary">
          Loading board...
        </div>
      </div>
    )
  }

  if (error || !board) {
    return (
      <div className="p-4 space-y-2">
        <div className="font-mono text-[11px] text-status-error">
          Failed to load board: {error || 'Unknown error'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <BoardView
        board={board}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
      />
    </div>
  )
}
