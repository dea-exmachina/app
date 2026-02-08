import type { KanbanLane, KanbanCard } from '@/types/kanban'
import { CardItem } from './CardItem'

interface LaneColumnProps {
  lane: KanbanLane
  onCardClick?: (card: KanbanCard) => void
}

export function LaneColumn({ lane, onCardClick }: LaneColumnProps) {
  const openCount = lane.cards.filter((c) => !c.completed).length

  return (
    <div className="flex w-[280px] shrink-0 flex-col">
      {/* Lane Header — terminal-section style */}
      <div className="mb-2 flex items-baseline justify-between border-b border-terminal-border pb-1">
        <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-terminal-fg-secondary">
          {lane.name}
        </h3>
        <span className="font-mono text-[11px] text-terminal-fg-tertiary">
          {openCount}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-1.5">
        {lane.cards.length === 0 ? (
          <div className="rounded-sm border border-dashed border-terminal-border p-3 text-center font-mono text-[11px] text-terminal-fg-tertiary">
            No cards
          </div>
        ) : (
          lane.cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              onClick={onCardClick ? () => onCardClick(card) : undefined}
            />
          ))
        )}
      </div>
    </div>
  )
}
