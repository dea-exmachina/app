import type { KanbanLane } from '@/types/kanban'
import { CardItem } from './CardItem'

interface LaneColumnProps {
  lane: KanbanLane
}

export function LaneColumn({ lane }: LaneColumnProps) {
  return (
    <div className="flex w-80 shrink-0 flex-col">
      {/* Lane Header */}
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="font-mono text-sm font-semibold">{lane.name}</h3>
        <span className="font-mono text-xs text-muted-foreground">
          {lane.cards.length}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {lane.cards.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No cards
          </div>
        ) : (
          lane.cards.map((card) => <CardItem key={card.id} card={card} />)
        )}
      </div>
    </div>
  )
}
