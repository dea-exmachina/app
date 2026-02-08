'use client'

import { WidgetGrid } from '@/components/widgets/WidgetGrid'
import { DashboardWidgetProvider } from '@/components/widgets/dashboard/DashboardWidgetProvider'
import { dashboardConfig } from '@/config/layouts/dashboard'

export default function DashboardPage() {
  return (
    <DashboardWidgetProvider>
      <WidgetGrid config={dashboardConfig} />
    </DashboardWidgetProvider>
  )
}
