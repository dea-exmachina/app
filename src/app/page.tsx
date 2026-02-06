'use client'

import { WidgetGrid } from '@/components/widgets/WidgetGrid'
import { WidgetToolbar } from '@/components/widgets/WidgetToolbar'
import { DashboardWidgetProvider } from '@/components/widgets/dashboard/DashboardWidgetProvider'
import { dashboardConfig } from '@/config/layouts/dashboard'

export default function DashboardPage() {
  return (
    <DashboardWidgetProvider>
      <WidgetToolbar pageId="dashboard" />
      <WidgetGrid pageId="dashboard" config={dashboardConfig} />
    </DashboardWidgetProvider>
  )
}
