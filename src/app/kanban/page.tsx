'use client'

import { WidgetGrid } from '@/components/widgets/WidgetGrid'
import { kanbanConfig } from '@/config/layouts/kanban'

export default function KanbanPage() {
  return <WidgetGrid config={kanbanConfig} />
}
