'use client'

import { ModuleShell } from '@/components/layout/ModuleShell'
import { AgentGrid } from './components/AgentGrid'

export default function QueenAgentsPage() {
  return (
    <ModuleShell
      title="Agent Health"
      description="Monitor agent status, heartbeats, and stuck detection alerts"
    >
      <AgentGrid />
    </ModuleShell>
  )
}
