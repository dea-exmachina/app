'use client'

import { WidgetGrid } from '@/components/widgets/WidgetGrid'
import { projectsConfig } from '@/config/layouts/projects'

export default function ProjectsPage() {
  return <WidgetGrid config={projectsConfig} />
}
