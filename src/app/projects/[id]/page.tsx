'use client'

import { use, useMemo } from 'react'
import Link from 'next/link'
import { ProjectDashboardProvider } from '@/components/widgets/project-detail/ProjectDashboardProvider'
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
    <div className="space-y-4">
      <Link
        href="/projects"
        className="font-mono text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to projects
      </Link>

      <ProjectDashboardProvider slugOrId={id}>
        <WidgetGrid config={config} />
      </ProjectDashboardProvider>
    </div>
  )
}
