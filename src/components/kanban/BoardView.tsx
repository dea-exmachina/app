import type { KanbanBoard } from '@/types/kanban'
import { LaneColumn } from './LaneColumn'
import { BoardStats } from './BoardStats'

interface BoardViewProps {
  board: KanbanBoard
}

export function BoardView({ board }: BoardViewProps) {
  return (
    <div className="space-y-4">
      {/* Board Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{board.name}</h2>
          <div className="font-mono text-xs text-muted-foreground">
            {board.filePath}
          </div>
        </div>
        <BoardStats board={board} />
      </div>

      {/* Lanes - Horizontal Scroll */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4">
          {board.lanes.map((lane) => (
            <LaneColumn key={lane.name} lane={lane} />
          ))}
        </div>
      </div>
    </div>
  )
}
