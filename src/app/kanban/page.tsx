'use client'

import { WidgetGrid } from '@/components/widgets/WidgetGrid'
import { WidgetToolbar } from '@/components/widgets/WidgetToolbar'
import { kanbanConfig } from '@/config/layouts/kanban'

export default function KanbanPage() {
  return (
    <>
      <WidgetToolbar pageId="kanban" />
      <WidgetGrid pageId="kanban" config={kanbanConfig} />
    </>
  )
}
