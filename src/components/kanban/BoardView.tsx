'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import type { KanbanBoard, KanbanCard, KanbanLane } from '@/types/kanban'
import { LaneColumn } from './LaneColumn'
import { BoardStats } from './BoardStats'
import { CardDetailPanel } from './CardDetailPanel'
import { CardItem } from './CardItem'

interface BoardViewProps {
  board: KanbanBoard
}

export function BoardView({ board }: BoardViewProps) {
  // Local board state for optimistic DnD
  const [lanes, setLanes] = useState<KanbanLane[]>(board.lanes)
  const [locked, setLocked] = useState(true)
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null)

  const [selectedCard, setSelectedCard] = useState<{
    card: KanbanCard
    lane: string
  } | null>(null)

  // Build card→lane lookup
  const cardLaneMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const lane of lanes) {
      for (const card of lane.cards) {
        map.set(card.id, lane.name)
      }
    }
    return map
  }, [lanes])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const cardId = event.active.id as string
      for (const lane of lanes) {
        const card = lane.cards.find((c) => c.id === cardId)
        if (card) {
          setActiveCard(card)
          break
        }
      }
    },
    [lanes]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveCard(null)
      const { active, over } = event
      if (!over) return

      const cardId = active.id as string
      const targetLaneName = over.id as string
      const sourceLaneName = cardLaneMap.get(cardId)

      if (!sourceLaneName || sourceLaneName === targetLaneName) return

      // Move card between lanes (optimistic)
      setLanes((prev) => {
        const next = prev.map((lane) => ({ ...lane, cards: [...lane.cards] }))
        const srcLane = next.find((l) => l.name === sourceLaneName)
        const dstLane = next.find((l) => l.name === targetLaneName)
        if (!srcLane || !dstLane) return prev

        const cardIdx = srcLane.cards.findIndex((c) => c.id === cardId)
        if (cardIdx === -1) return prev

        const [card] = srcLane.cards.splice(cardIdx, 1)
        dstLane.cards.push(card)
        return next
      })
    },
    [cardLaneMap]
  )

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocked((v) => !v)}
            className={`font-mono text-[10px] px-2 py-0.5 rounded-sm border transition-colors ${
              locked
                ? 'border-terminal-border text-terminal-fg-tertiary hover:text-terminal-fg-secondary'
                : 'border-status-warn text-status-warn bg-status-warn/10'
            }`}
          >
            {locked ? 'LOCKED' : 'UNLOCKED'}
          </button>
          <BoardStats board={{ ...board, lanes }} />
        </div>
      </div>

      {/* Lanes — Horizontal Scroll */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={locked ? undefined : handleDragStart}
        onDragEnd={locked ? undefined : handleDragEnd}
      >
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3">
            {lanes.map((lane) => (
              <LaneColumn
                key={lane.name}
                lane={lane}
                onCardClick={handleCardClick(lane.name)}
                droppable={!locked}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="w-[280px] opacity-80">
              <CardItem card={activeCard} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
