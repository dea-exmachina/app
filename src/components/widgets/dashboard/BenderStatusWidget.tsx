'use client'

import { ActiveBendersTable } from '@/components/dashboard/BenderStatusWidget'
import { useDashboardContext } from './DashboardWidgetProvider'

export function BenderStatusWidget() {
  const { data } = useDashboardContext()

  return <ActiveBendersTable benders={data.activeBenders} />
}
