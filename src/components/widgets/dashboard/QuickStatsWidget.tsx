'use client'

import { TickerBar } from '@/components/dashboard/QuickStats'
import { useDashboardContext } from './DashboardWidgetProvider'

export function QuickStatsWidget() {
  const { data } = useDashboardContext()

  const totalOpen = data.boardStats.reduce((sum, b) => sum + b.totalOpen, 0)
  const totalDone = data.boardStats.reduce((sum, b) => sum + b.totalCompleted, 0)
  const totalAll = totalOpen + totalDone
  const avgCompletion = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0

  const activeCount = data.activeBenders.filter(
    (b) => b.status.toLowerCase() !== 'idle'
  ).length

  // Count blockers from handoff data
  const blockerCount = data.handoff?.blockers?.length ?? 0

  return (
    <TickerBar
      openCards={totalOpen}
      blockers={blockerCount}
      boardCompletion={avgCompletion}
      inboxPending={0}
      benderActive={activeCount}
      benderTotal={data.activeBenders.length}
    />
  )
}
