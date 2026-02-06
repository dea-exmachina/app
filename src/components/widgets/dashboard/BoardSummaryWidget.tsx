'use client'

import { BoardSummaryCard } from '@/components/dashboard/BoardSummaryCard'
import { useDashboardContext } from './DashboardWidgetProvider'

export function BoardSummaryWidget() {
  const { data } = useDashboardContext()

  if (data.boardStats.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">No boards available</div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.boardStats.map((board) => (
        <BoardSummaryCard key={board.id} board={board} />
      ))}
    </div>
  )
}
