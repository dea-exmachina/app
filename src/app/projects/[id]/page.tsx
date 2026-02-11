'use client'

import { use, useMemo } from 'react'
import { ProjectDashboardProvider } from '@/components/widgets/project-detail/ProjectDashboardProvider'
import { ProjectBanner } from '@/components/widgets/project-detail/ProjectBanner'
import { WidgetGrid } from '@/components/widgets/WidgetGrid'
import { createProjectDetailConfig } from '@/config/layouts/project-detail'

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const config = useMemo(() => createProjectDetailConfig(id), [id])

  return (
    <ProjectDashboardProvider slugOrId={id}>
      <div className="space-y-4">
        <ProjectBanner />
        <WidgetGrid config={config} />
      </div>
    </ProjectDashboardProvider>
  )
}
