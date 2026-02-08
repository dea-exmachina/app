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
    <div className="flex items-center gap-4 font-mono text-[11px]">
      <span>
        <span className="text-terminal-fg-tertiary uppercase tracking-wider">open </span>
        <span className="font-semibold text-terminal-fg-primary">{openCards}</span>
      </span>
      <span className="text-terminal-fg-tertiary">|</span>
      <span>
        <span className="text-terminal-fg-tertiary uppercase tracking-wider">done </span>
        <span className="text-terminal-fg-secondary">{completedCards}</span>
      </span>
    </div>
  )
}
