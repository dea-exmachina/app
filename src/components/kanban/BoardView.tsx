'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import type { KanbanBoard, KanbanCard } from '@/types/kanban'
import { LaneColumn } from './LaneColumn'
import { BoardStats } from './BoardStats'
import { CardDetailPanel } from './CardDetailPanel'

interface BoardViewProps {
  board: KanbanBoard
}

export function BoardView({ board }: BoardViewProps) {
  const [selectedCard, setSelectedCard] = useState<{
    card: KanbanCard
    lane: string
  } | null>(null)

  const handleCardClick = useCallback(
    (laneName: string) => (card: KanbanCard) => {
      setSelectedCard({ card, lane: laneName })
    },
    []
  )

  const handleClose = useCallback(() => {
    setSelectedCard(null)
  }, [])

  return (
    <div className="space-y-3">
      {/* Board Header — terminal style */}
      <div className="flex items-center justify-between border-b border-terminal-border pb-2">
        <div className="flex items-center gap-3">
          <Link
            href="/kanban"
            className="font-mono text-[12px] text-terminal-fg-tertiary hover:text-user-accent transition-colors"
          >
            BOARDS
          </Link>
          <span className="text-terminal-fg-tertiary font-mono text-[12px]">/</span>
          <h2 className="font-mono text-[12px] font-semibold uppercase tracking-wider text-terminal-fg-primary">
            {board.name}
          </h2>
        </div>
        <BoardStats board={board} />
      </div>

      {/* Lanes — Horizontal Scroll */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3">
          {board.lanes.map((lane) => (
            <LaneColumn
              key={lane.name}
              lane={lane}
              onCardClick={handleCardClick(lane.name)}
            />
          ))}
        </div>
      </div>

      {/* Card Detail Panel */}
      {selectedCard && (
        <CardDetailPanel
          card={selectedCard.card}
          lane={selectedCard.lane}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
