'use client'

import { MissionBriefing } from '@/components/dashboard/MissionBriefing'
import { useDashboardContext } from './DashboardWidgetProvider'

export function MissionBriefingWidget() {
  const { data } = useDashboardContext()

  return <MissionBriefing handoff={data.handoff} />
}
