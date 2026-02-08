'use client'

import { WidgetGrid } from '@/components/widgets/WidgetGrid'
import { workflowsConfig } from '@/config/layouts/workflows'

export default function WorkflowsPage() {
  return <WidgetGrid config={workflowsConfig} />
}
