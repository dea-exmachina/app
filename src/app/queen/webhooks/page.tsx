'use client'

import { ModuleShell } from '@/components/layout/ModuleShell'
import { WebhookList } from './components/WebhookList'

export default function QueenWebhooksPage() {
  return (
    <ModuleShell
      title="Webhook Config"
      description="Manage external webhook sources and field mapping configurations"
    >
      <WebhookList />
    </ModuleShell>
  )
}
