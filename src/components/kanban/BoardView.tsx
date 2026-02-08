import Link from 'next/link'
import type { KanbanBoard } from '@/types/kanban'
import { LaneColumn } from './LaneColumn'
import { BoardStats } from './BoardStats'

interface BoardViewProps {
  board: KanbanBoard
}

export function BoardView({ board }: BoardViewProps) {
  return (
    <div className="space-y-3">
      {/* Board Header — terminal style */}
      <div className="flex items-center justify-between border-b border-terminal-border pb-2">
        <div className="flex items-center gap-3">
          <Link
            href="/kanban"
            className="font-mono text-[11px] text-terminal-fg-tertiary hover:text-user-accent transition-colors"
          >
            BOARDS
          </Link>
          <span className="text-terminal-fg-tertiary font-mono text-[11px]">/</span>
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-terminal-fg-primary">
            {board.name}
          </h2>
        </div>
        <BoardStats board={board} />
      </div>

      {/* Lanes — Horizontal Scroll */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3">
          {board.lanes.map((lane) => (
            <LaneColumn key={lane.name} lane={lane} />
          ))}
        </div>
      </div>
    </div>
  )
}
