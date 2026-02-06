'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjects } from '@/hooks/useProjects'
import { getStatusColor } from '@/lib/client/formatters'
import type { ProjectLegacy as Project } from '@/types/project'

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="h-full transition-colors hover:border-primary/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="font-mono text-sm">{project.name}</CardTitle>
            <Badge
              variant="outline"
              className="shrink-0 font-mono text-xs"
              style={{
                borderColor: getStatusColor(project.status),
                color: getStatusColor(project.status),
              }}
            >
              {project.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <span className="font-mono text-xs text-muted-foreground">
              {project.domain}
            </span>
          </div>
          {project.overview && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {project.overview}
            </p>
          )}
          <div className="flex items-center gap-2 border-t border-border pt-3">
            <span className="font-mono text-xs text-muted-foreground">
              {project.files.length} file{project.files.length !== 1 ? 's' : ''}
            </span>
            {project.created && (
              <>
                <span className="text-muted-foreground">|</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {project.created}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function ProjectGridWidget() {
  const { data: projects, loading, error } = useProjects()

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    )
  }

  if (error || !projects) {
    return (
      <div className="text-sm text-destructive">
        Failed to load projects: {error || 'Unknown error'}
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No projects found in portfolio.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}
