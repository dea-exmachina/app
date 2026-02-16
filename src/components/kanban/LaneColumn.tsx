import { type MouseEvent } from 'react'
import { useDroppable } from '@dnd-kit/core'
import type { KanbanLane, KanbanCard, SortConfig, SortField } from '@/types/kanban'
import type { CardCommentSummary } from '@/types/nexus'
import { CardItem } from './CardItem'

interface LaneColumnProps {
  lane: KanbanLane
  onCardClick?: (card: KanbanCard) => void
  onCardSelect?: (cardId: string, additive: boolean) => void
  onCardContextMenu?: (e: MouseEvent, card: KanbanCard) => void
  selectedCards?: Set<string>
  droppable?: boolean
  unresolvedMap?: Map<string, CardCommentSummary>
  sortConfig?: SortConfig
  onSortChange?: (config: SortConfig) => void
}

export function LaneColumn({
  lane,
  onCardClick,
  onCardSelect,
  onCardContextMenu,
  selectedCards,
  droppable = false,
  unresolvedMap,
  sortConfig,
  onSortChange,
}: LaneColumnProps) {
  const openCount = lane.cards.filter((c) => !c.completed).length

  const { isOver, setNodeRef } = useDroppable({
    id: lane.name,
    disabled: !droppable,
  })

  const handleSortClick = (field: SortField) => {
    if (!onSortChange || !sortConfig) return

    if (sortConfig.field === field) {
      onSortChange({
        field,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
      })
    } else {
      onSortChange({
        field,
        direction: 'asc',
      })
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[280px] shrink-0 flex-col transition-colors ${
        isOver ? 'bg-user-accent-muted rounded-sm' : ''
      }`}
    >
      {/* Lane Header — terminal-section style */}
      <div className="mb-2 flex items-center justify-between border-b border-terminal-border pb-1">
        <div className="flex items-baseline gap-2">
          <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-terminal-fg-secondary">
            {lane.name}
          </h3>
          <span className="font-mono text-[11px] text-terminal-fg-tertiary">
            {openCount}
          </span>
        </div>

        {/* Sort Controls */}
        {sortConfig && onSortChange && (
          <div className="flex gap-1.5">
            <button
              onClick={() => handleSortClick('startedAt')}
              className={`font-mono text-[9px] hover:text-terminal-fg-secondary transition-colors uppercase ${
                sortConfig.field === 'startedAt'
                  ? 'text-user-accent'
                  : 'text-terminal-fg-tertiary'
              }`}
              title="Sort by Started date"
            >
              STA
              {sortConfig.field === 'startedAt' && (
                <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
            <button
              onClick={() => handleSortClick('completedAt')}
              className={`font-mono text-[9px] hover:text-terminal-fg-secondary transition-colors uppercase ${
                sortConfig.field === 'completedAt'
                  ? 'text-user-accent'
                  : 'text-terminal-fg-tertiary'
              }`}
              title="Sort by Completed date"
            >
              COM
              {sortConfig.field === 'completedAt' && (
                <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="space-y-1.5 min-h-[40px]">
        {lane.cards.length === 0 ? (
          <div className="rounded-sm border border-dashed border-terminal-border p-3 text-center font-mono text-[11px] text-terminal-fg-tertiary">
            No cards
          </div>
        ) : (
          lane.cards.map((card) => {
            const summary = unresolvedMap?.get(card.id)
            return (
              <CardItem
                key={card.id}
                card={card}
                onClick={onCardClick ? () => onCardClick(card) : undefined}
                onSelect={onCardSelect}
                onContextMenu={onCardContextMenu}
                selected={selectedCards?.has(card.id)}
                draggable={droppable}
                unresolvedCount={summary?.unresolved_count}
                hasQuestions={summary?.has_questions}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
