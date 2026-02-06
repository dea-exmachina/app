import type { KanbanBoard } from '@/types/kanban'

interface BoardStatsProps {
  board: KanbanBoard
}

export function BoardStats({ board }: BoardStatsProps) {
  const totalCards = board.lanes.reduce(
    (sum, lane) => sum + lane.cards.length,
    0
  )
  const completedCards = board.lanes.reduce(
    (sum, lane) => sum + lane.cards.filter((c) => c.completed).length,
    0
  )
  const openCards = totalCards - completedCards

  return (
    <div className="flex items-center gap-6 font-mono text-sm">
      <div>
        <span className="text-muted-foreground">Total:</span>{' '}
        <span className="font-semibold">{totalCards}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Open:</span>{' '}
        <span className="font-semibold">{openCards}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Completed:</span>{' '}
        <span className="font-semibold">{completedCards}</span>
      </div>
    </div>
  )
}
