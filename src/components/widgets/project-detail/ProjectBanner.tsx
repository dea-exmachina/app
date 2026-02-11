'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { useProjectDashboardContext } from './ProjectDashboardProvider'

export function ProjectBanner() {
  const { data } = useProjectDashboardContext()
  const { project } = data

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link
          href="/projects"
          className="font-mono text-sm text-terminal-fg-tertiary hover:text-terminal-fg-primary transition-colors"
        >
          &larr;
        </Link>
        <h1 className="font-mono text-2xl font-bold text-terminal-fg-primary tracking-tight">
          {project.name}
        </h1>
        <Badge variant="terminal">{project.type}</Badge>
      </div>
    </div>
  )
}
