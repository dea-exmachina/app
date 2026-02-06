'use client'

import { ModuleShell } from '@/components/layout/ModuleShell'
import { EventList } from './components/EventList'

export default function QueenEventsPage() {
  return (
    <ModuleShell
      title="QUEEN Events"
      description="Real-time event feed from the external orchestration pipeline"
    >
      <EventList />
    </ModuleShell>
  )
}
