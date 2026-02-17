'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import type { KanbanBoard, KanbanCard, KanbanLane } from '@/types/kanban'
import { BoardView } from './BoardView'

const BENDER_LANES = ['proposed', 'queued', 'executing', 'delivered', 'integrated'] as const
const BENDER_LANE_LABELS: Record<string, string> = {
  proposed: 'Proposed',
  queued: 'Queued',
  executing: 'Executing',
  delivered: 'Delivered',
  integrated: 'Integrated',
}

export function BenderBoardView() {
  const searchParams = useSearchParams()
  const projectFilter = searchParams.get('project') ?? ''

  const [board, setBoard] = useState<KanbanBoard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<{ start?: Date; end?: Date }>({})

  const fetchBoard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Reuse the unified API — we'll regroup by bender_lane on the client
      const url = projectFilter
        ? `/api/kanban/unified?project=${encodeURIComponent(projectFilter)}`
        : '/api/kanban/unified'
      const res = await fetch(url)
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)

      // The unified API returns cards grouped by standard lanes.
      // We need to flatten and regroup by bender_lane from metadata.
      const unifiedBoard = json.data as KanbanBoard
      const allCards: KanbanCard[] = unifiedBoard.lanes.flatMap(l => l.cards)

      // Filter to only bender cards (those with Bender Lane metadata)
      const benderCards = allCards.filter(c => c.metadata['Bender Lane'])

      const lanes: KanbanLane[] = BENDER_LANES.map(lane => ({
        name: BENDER_LANE_LABELS[lane],
        cards: benderCards.filter(c => c.metadata['Bender Lane'] === lane),
      }))

      const benderBoard: KanbanBoard = {
        id: 'bender',
        name: 'Bender Pipeline',
        filePath: '',
        handoff: null,
        lanes,
      }

      setBoard(benderBoard)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bender board')
    } finally {
      setLoading(false)
    }
  }, [projectFilter])

  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  const totalCards = board ? board.lanes.reduce((sum, l) => sum + l.cards.length, 0) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        Loading bender board...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32 text-destructive">
        {error}
      </div>
    )
  }

  if (!board || totalCards === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No bender-delegated cards{projectFilter ? ` in ${projectFilter}` : ''}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-semibold tracking-tight">Bender Pipeline</h2>
        <span className="text-xs text-muted-foreground">
          {totalCards} delegated cards
        </span>
      </div>
      <BoardView
        board={board}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
      />
    </div>
  )
}
