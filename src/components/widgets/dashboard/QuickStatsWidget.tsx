'use client'

import { QuickStats } from '@/components/dashboard/QuickStats'
import { useDashboardContext } from './DashboardWidgetProvider'

export function QuickStatsWidget() {
  const { data } = useDashboardContext()

  return (
    <QuickStats
      boardCount={data.boardStats.length}
      skillCount={data.skillCount}
      workflowCount={data.workflowCount}
      benderCount={data.activeBenders.length}
    />
  )
}
