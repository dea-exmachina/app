'use client'

import { useState, useCallback, useMemo, useEffect, type MouseEvent } from 'react'
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns'
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
import type { KanbanBoard, KanbanCard, KanbanLane, SortConfig } from '@/types/kanban'
import { moveCard, updateCard, postComment, markCardReviewed } from '@/lib/client/api'
import { useUnresolvedComments } from '@/hooks/useUnresolvedComments'
import { LaneColumn } from './LaneColumn'
import { BoardStats } from './BoardStats'
import { CardDetailPanel } from './CardDetailPanel'
import { CardItem } from './CardItem'
import { CardContextMenu, type ContextMenuAction } from './CardContextMenu'
import { BacklogPanel } from './BacklogPanel'

/** Map display lane names back to DB lane values for NEXUS persistence */
const LANE_TO_DB: Record<string, string> = {
  'Backlog': 'backlog',
  'Ready': 'ready',
  'In Progress': 'in_progress',
  'Review': 'review',
  'Done': 'done',
}

const DB_TO_LANE: Record<string, string> = {
  backlog: 'Backlog',
  ready: 'Ready',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

interface BoardViewProps {
  board: KanbanBoard
  dateFilter: { start?: Date; end?: Date }
  onDateFilterChange: (filter: { start?: Date; end?: Date }) => void
}

export function BoardView({ board, dateFilter, onDateFilterChange }: BoardViewProps) {
  // Local board state for optimistic DnD
  const [lanes, setLanes] = useState<KanbanLane[]>(board.lanes)
  const [locked, setLocked] = useState(true)
  const [nexusFirst, setNexusFirst] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem('kanban-nexus-first')
    return stored === null ? true : stored === 'true'
  })

  // Sync local lanes when board updates (e.g. from date filter refetch)
  useEffect(() => {
    setLanes(board.lanes)
  }, [board.lanes])

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'startedAt',
    direction: 'asc',
  })
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null)
  const [viewMode, setViewMode] = useState<'standard' | 'bender'>('standard')

  const [selectedCard, setSelectedCard] = useState<{
    card: KanbanCard
    lane: string
  } | null>(null)

  // Multi-select state
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  // Track the last card ID clicked for shift+click range select
  const [lastSelectedCardId, setLastSelectedCardId] = useState<string | null>(null)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    cards: KanbanCard[]
  } | null>(null)

  // Unresolved comments for badge display
  const { unresolvedMap, cardsNeedingAttention } = useUnresolvedComments()

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

  // Derive sorted lanes for display (filter out Backlog)
  const displayLanes = useMemo(() => {
    return lanes
      .filter(lane => lane.name !== 'Backlog')
      .map((lane) => {
        const sortedCards = [...lane.cards].sort((a, b) => {
          // Tier-0 boost: DEA-* and NEXUS-* float to top when nexusFirst enabled
          if (nexusFirst) {
            const aIsNexus = /^(DEA|NEXUS)-/.test(a.id)
            const bIsNexus = /^(DEA|NEXUS)-/.test(b.id)
            if (aIsNexus && !bIsNexus) return -1
            if (!aIsNexus && bIsNexus) return 1
          }
          // Normal sort within tier
          const getDate = (card: KanbanCard, field: 'startedAt' | 'completedAt') => {
            const val = card[field]
            return val ? new Date(val).getTime() : 0
          }
          const timeA = getDate(a, sortConfig.field)
          const timeB = getDate(b, sortConfig.field)
          if (timeA === timeB) return a.id.localeCompare(b.id)
          return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA
        })
        return { ...lane, cards: sortedCards }
      })
  }, [lanes, sortConfig, nexusFirst])

  // Extract backlog cards
  const backlogCards = useMemo(() => {
    const bl = lanes.find(l => l.name === 'Backlog')
    return bl?.cards ?? []
  }, [lanes])

  const handlePromoteCard = useCallback((cardId: string) => {
    setLanes(prev => prev.map(lane => {
      if (lane.name === 'Backlog') {
        return { ...lane, cards: lane.cards.filter(c => c.id !== cardId) }
      }
      if (lane.name === 'Ready') {
        const card = prev.find(l => l.name === 'Backlog')?.cards.find(c => c.id === cardId)
        return card ? { ...lane, cards: [...lane.cards, card] } : lane
      }
      return lane
    }))
  }, [])

  const handleBulkPromote = useCallback((cardIds: string[]) => {
    const idSet = new Set(cardIds)
    setLanes(prev => {
      const toPromote = prev.find(l => l.name === 'Backlog')?.cards.filter(c => idSet.has(c.id)) ?? []
      return prev.map(lane => {
        if (lane.name === 'Backlog') {
          return { ...lane, cards: lane.cards.filter(c => !idSet.has(c.id)) }
        }
        if (lane.name === 'Ready') {
          return { ...lane, cards: [...lane.cards, ...toPromote] }
        }
        return lane
      })
    })
  }, [])

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

      // Persist lane move to NEXUS
      const dbLane = LANE_TO_DB[targetLaneName]
      if (dbLane) {
        moveCard(cardId, dbLane).catch((err) => {
          console.error('Failed to persist lane move:', err)
        })
      }
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

  // ── Multi-select ──────────────────────────────────────

  const handleCardSelect = useCallback(
    (cardId: string, _additive: boolean, shift: boolean) => {
      if (shift && lastSelectedCardId) {
        // Find which lane both cards belong to and select the range
        for (const lane of displayLanes) {
          const ids = lane.cards.map((c) => c.id)
          const lastIdx = ids.indexOf(lastSelectedCardId)
          const curIdx = ids.indexOf(cardId)
          if (lastIdx !== -1 && curIdx !== -1) {
            const [lo, hi] = lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx]
            const rangeIds = ids.slice(lo, hi + 1)
            setSelectedCards((prev) => {
              const next = new Set(prev)
              for (const id of rangeIds) next.add(id)
              return next
            })
            setLastSelectedCardId(cardId)
            return
          }
        }
      }
      // Normal toggle
      setSelectedCards((prev) => {
        const next = new Set(prev)
        if (next.has(cardId)) {
          next.delete(cardId)
        } else {
          next.add(cardId)
        }
        return next
      })
      setLastSelectedCardId(cardId)
    },
    [lastSelectedCardId, displayLanes]
  )

  // Escape key clears selection
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedCards.size > 0) {
        setSelectedCards(new Set())
        setLastSelectedCardId(null)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [selectedCards.size])

  // Clear selection when clicking empty area
  const handleBoardClick = useCallback(() => {
    if (selectedCards.size > 0) {
      setSelectedCards(new Set())
      setLastSelectedCardId(null)
    }
  }, [selectedCards.size])

  // Select all cards in a lane
  const handleSelectAll = useCallback((laneCardIds: string[]) => {
    setSelectedCards((prev) => {
      const next = new Set(prev)
      for (const id of laneCardIds) next.add(id)
      return next
    })
    if (laneCardIds.length > 0) {
      setLastSelectedCardId(laneCardIds[laneCardIds.length - 1])
    }
  }, [])

  // ── Context Menu ──────────────────────────────────────

  const handleCardContextMenu = useCallback(
    (e: MouseEvent, card: KanbanCard) => {
      // If right-clicked card isn't selected, select it alone
      let targetCards: KanbanCard[]
      if (selectedCards.has(card.id)) {
        // Collect all selected cards from lanes
        targetCards = []
        for (const lane of lanes) {
          for (const c of lane.cards) {
            if (selectedCards.has(c.id)) targetCards.push(c)
          }
        }
      } else {
        setSelectedCards(new Set([card.id]))
        targetCards = [card]
      }

      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        cards: targetCards,
      })
    },
    [selectedCards, lanes]
  )

  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handleContextMenuAction = useCallback(
    async (action: ContextMenuAction) => {
      if (!contextMenu) return

      // Clear selection — no per-card work needed
      if (action.type === 'clear') {
        setSelectedCards(new Set())
        setLastSelectedCardId(null)
        return
      }

      const cards = contextMenu.cards

      for (const card of cards) {
        try {
          switch (action.type) {
            case 'flag':
              await updateCard(card.id, { ready_for_production: true })
              await markCardReviewed(card.id)
              // Optimistic: update local card state
              setLanes((prev) =>
                prev.map((l) => ({
                  ...l,
                  cards: l.cards.map((c) =>
                    c.id === card.id ? { ...c, readyForProduction: true, reviewed: true } : c
                  ),
                }))
              )
              // Fire-and-forget tracking comment
              postComment(card.id, {
                author: 'webapp',
                content: '✅ Marked as reviewed',
                comment_type: 'note',
              }).catch((err) => console.warn('Tracking comment failed:', err))
              break
            case 'unflag':
              await updateCard(card.id, { ready_for_production: false })
              setLanes((prev) =>
                prev.map((l) => ({
                  ...l,
                  cards: l.cards.map((c) =>
                    c.id === card.id ? { ...c, readyForProduction: false } : c
                  ),
                }))
              )
              postComment(card.id, {
                author: 'webapp',
                content: '⏳ Marked as pending',
                comment_type: 'note',
              }).catch((err) => console.warn('Tracking comment failed:', err))
              break
            case 'move':
              if (action.value) {
                await moveCard(card.id, action.value)
                // Optimistic lane move
                const displayLane = DB_TO_LANE[action.value]
                if (displayLane) {
                  setLanes((prev) => {
                    const next = prev.map((l) => ({ ...l, cards: [...l.cards] }))
                    // Remove from current lane
                    for (const lane of next) {
                      const idx = lane.cards.findIndex((c) => c.id === card.id)
                      if (idx !== -1) {
                        lane.cards.splice(idx, 1)
                        break
                      }
                    }
                    // Add to target lane
                    const target = next.find((l) => l.name === displayLane)
                    if (target) target.cards.push(card)
                    return next
                  })
                }
              }
              break
            case 'priority':
              if (action.value) {
                await updateCard(card.id, { priority: action.value })
              }
              break
          }
        } catch (err) {
          console.error(`Failed to ${action.type} card ${card.id}:`, err)
        }
      }

      setSelectedCards(new Set())
      setLastSelectedCardId(null)
    },
    [contextMenu]
  )

  // Check if all selected context cards are in review lane
  const contextAllInReview = useMemo(() => {
    if (!contextMenu) return false
    return contextMenu.cards.every((card) => {
      const laneName = cardLaneMap.get(card.id)
      return laneName === 'Review'
    })
  }, [contextMenu, cardLaneMap])

  const handleViewToggle = useCallback(() => {
    const newMode = viewMode === 'standard' ? 'bender' : 'standard'
    setViewMode(newMode)
    // Fetch board with new view mode
    const url = `/api/kanban/boards/${board.id}${newMode === 'bender' ? '?view=bender' : ''}`
    fetch(url)
      .then(res => res.json())
      .then(json => {
        if (json.data) {
          setLanes(json.data.lanes)
        }
      })
      .catch(err => console.error('Failed to switch view:', err))
  }, [viewMode, board.id])

  return (
    <div className="space-y-3" onClick={handleBoardClick}>
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

          <div className="h-4 w-[1px] bg-terminal-border mx-2" />

          {/* Date Filter */}
          <div className="flex items-center gap-1 font-mono text-[10px]">
            <button
              onClick={() => {
                if (!dateFilter.start || !dateFilter.end) return
                onDateFilterChange({
                  start: subWeeks(dateFilter.start, 1),
                  end: subWeeks(dateFilter.end, 1),
                })
              }}
              className="px-1 text-terminal-fg-tertiary hover:text-terminal-fg-primary transition-colors hover:bg-terminal-hl/10 rounded"
            >
              &lt;
            </button>
            <span className="text-terminal-fg-secondary min-w-[120px] text-center">
              {dateFilter.start && dateFilter.end
                ? `${format(dateFilter.start, 'MMM d')} – ${format(dateFilter.end, 'MMM d')}`
                : 'All Time'}
            </span>
            <button
              onClick={() => {
                if (!dateFilter.start || !dateFilter.end) return
                onDateFilterChange({
                  start: addWeeks(dateFilter.start, 1),
                  end: addWeeks(dateFilter.end, 1),
                })
              }}
              className="px-1 text-terminal-fg-tertiary hover:text-terminal-fg-primary transition-colors hover:bg-terminal-hl/10 rounded"
            >
              &gt;
            </button>
            <button
              onClick={() => {
                const now = new Date()
                onDateFilterChange({
                  start: startOfWeek(now, { weekStartsOn: 1 }),
                  end: endOfWeek(now, { weekStartsOn: 1 }),
                })
              }}
              className="ml-2 px-2 py-0.5 border border-terminal-border rounded text-[10px] text-terminal-fg-tertiary hover:text-terminal-fg-primary hover:border-terminal-fg-secondary transition-colors"
            >
              THIS WEEK
            </button>
            <button
              onClick={() => onDateFilterChange({})}
              className="ml-1 px-2 py-0.5 border border-terminal-border rounded text-[10px] text-terminal-fg-tertiary hover:text-terminal-fg-primary hover:border-terminal-fg-secondary transition-colors"
            >
              ALL
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {selectedCards.size > 0 && (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-sm border border-user-accent/40 text-user-accent bg-user-accent/10">
              {selectedCards.size} SELECTED
            </span>
          )}
          {cardsNeedingAttention > 0 && (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-sm border border-amber-500/40 text-amber-400 bg-amber-500/10">
              {cardsNeedingAttention} NEED ATTENTION
            </span>
          )}
          <button
            onClick={handleViewToggle}
            className="font-mono text-[10px] px-2 py-0.5 rounded-sm border border-terminal-border text-terminal-fg-tertiary hover:text-terminal-fg-secondary transition-colors"
          >
            {viewMode === 'standard' ? 'STANDARD' : 'BENDER'}
          </button>
          <button
            onClick={() => {
              const next = !nexusFirst
              setNexusFirst(next)
              localStorage.setItem('kanban-nexus-first', String(next))
            }}
            className={`font-mono text-[10px] px-2 py-0.5 rounded-sm border transition-colors ${
              nexusFirst
                ? 'border-user-accent/40 text-user-accent bg-user-accent/5'
                : 'border-terminal-border text-terminal-fg-tertiary hover:text-terminal-fg-secondary'
            }`}
          >
            NEXUS↑
          </button>
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
            {displayLanes.map((lane) => (
              <LaneColumn
                key={lane.name}
                lane={lane}
                onCardClick={handleCardClick(lane.name)}
                onCardSelect={handleCardSelect}
                onCardContextMenu={handleCardContextMenu}
                onSelectAll={handleSelectAll}
                onCardReview={(cardId) => {
                  // Optimistically update: mark card reviewed so checkmark appears
                  setLanes(prev => prev.map(l => ({
                    ...l,
                    cards: l.cards.map(c =>
                      c.id === cardId ? { ...c, reviewed: true } : c
                    ),
                  })))
                }}
                selectedCards={selectedCards}
                droppable={!locked}
                sortConfig={sortConfig}
                onSortChange={setSortConfig}
                unresolvedMap={unresolvedMap}
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

      {/* Backlog Triage Panel */}
      <BacklogPanel
        cards={backlogCards}
        onPromote={handlePromoteCard}
        onBulkPromote={handleBulkPromote}
      />

      {/* Card Detail Panel */}
      {selectedCard && (
        <CardDetailPanel
          card={selectedCard.card}
          lane={selectedCard.lane}
          onClose={handleClose}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <CardContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          cardCount={contextMenu.cards.length}
          allInReview={contextAllInReview}
          onAction={handleContextMenuAction}
          onClose={handleContextMenuClose}
        />
      )}
    </div>
  )
}
