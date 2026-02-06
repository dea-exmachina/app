'use client'

import { WidgetGrid } from '@/components/widgets/WidgetGrid'
import { WidgetToolbar } from '@/components/widgets/WidgetToolbar'
import { projectsConfig } from '@/config/layouts/projects'

export default function ProjectsPage() {
  return (
    <>
      <WidgetToolbar pageId="projects" />
      <WidgetGrid pageId="projects" config={projectsConfig} />
    </>
  )
}
