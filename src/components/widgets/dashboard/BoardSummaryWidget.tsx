'use client'

import { BoardSummaryTable } from '@/components/dashboard/BoardSummaryCard'
import { useDashboardContext } from './DashboardWidgetProvider'

export function BoardSummaryWidget() {
  const { data } = useDashboardContext()

  if (data.boardStats.length === 0) {
    return (
      <div className="text-xs text-terminal-fg-tertiary font-mono">
        No boards available
      </div>
    )
  }

  return <BoardSummaryTable boards={data.boardStats} />
}
