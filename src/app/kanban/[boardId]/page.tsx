'use client'

import { useState, use } from 'react'
import { startOfWeek, endOfWeek } from 'date-fns'
import { BoardView } from '@/components/kanban/BoardView'
import { TableView } from '@/components/kanban/TableView'
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

  const [layout, setLayout] = useState<'board' | 'table'>('board')
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
      {/* Layout toggle */}
      <div className="flex justify-end mb-2">
        <div className="flex border border-terminal-border rounded-sm overflow-hidden">
          <button
            onClick={() => setLayout('board')}
            className={`font-mono text-[10px] px-2 py-0.5 transition-colors ${
              layout === 'board'
                ? 'bg-user-accent/15 text-user-accent'
                : 'text-terminal-fg-tertiary hover:text-terminal-fg-secondary'
            }`}
          >
            BOARD
          </button>
          <button
            onClick={() => setLayout('table')}
            className={`font-mono text-[10px] px-2 py-0.5 transition-colors border-l border-terminal-border ${
              layout === 'table'
                ? 'bg-user-accent/15 text-user-accent'
                : 'text-terminal-fg-tertiary hover:text-terminal-fg-secondary'
            }`}
          >
            TABLE
          </button>
        </div>
      </div>

      {layout === 'board' ? (
        <BoardView
          board={board}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
        />
      ) : (
        <TableView board={board} />
      )}
    </div>
  )
}
