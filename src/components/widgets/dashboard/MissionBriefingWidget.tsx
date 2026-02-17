'use client'

import { MissionBriefing } from '@/components/dashboard/MissionBriefing'
import { SessionArchive } from '@/components/dashboard/SessionArchive'
import { useDashboardContext } from './DashboardWidgetProvider'

export function MissionBriefingWidget() {
  const { data } = useDashboardContext()

  return (
    <div className="space-y-3">
      <MissionBriefing handoff={data.handoff} />
      <SessionArchive />
    </div>
  )
}
