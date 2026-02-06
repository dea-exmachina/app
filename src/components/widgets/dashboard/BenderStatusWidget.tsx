'use client'

import { BenderStatusWidget as BenderStatus } from '@/components/dashboard/BenderStatusWidget'
import { useDashboardContext } from './DashboardWidgetProvider'

export function BenderStatusWidget() {
  const { data } = useDashboardContext()

  return <BenderStatus benders={data.activeBenders} />
}
