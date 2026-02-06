'use client'

import { ModuleShell } from '@/components/layout/ModuleShell'
import { ComplianceOverview } from './components/ComplianceOverview'

export default function CompliancePage() {
  return (
    <ModuleShell
      title="Compliance Scorecard"
      description="Component health scores, deductive scoring, and bender streak tracking"
    >
      <ComplianceOverview />
    </ModuleShell>
  )
}
