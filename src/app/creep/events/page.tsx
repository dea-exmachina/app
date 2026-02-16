'use client'

import { ModuleShell } from '@/components/layout/ModuleShell'
import { EventList } from './components/EventList'

export default function CreepEventsPage() {
  return (
    <ModuleShell
      title="CREEP Events"
      description="Real-time event feed from the external orchestration pipeline"
    >
      <EventList />
    </ModuleShell>
  )
}
