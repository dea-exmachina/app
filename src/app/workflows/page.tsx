'use client'

import { WidgetGrid } from '@/components/widgets/WidgetGrid'
import { WidgetToolbar } from '@/components/widgets/WidgetToolbar'
import { workflowsConfig } from '@/config/layouts/workflows'

export default function WorkflowsPage() {
  return (
    <>
      <WidgetToolbar pageId="workflows" />
      <WidgetGrid pageId="workflows" config={workflowsConfig} />
    </>
  )
}
