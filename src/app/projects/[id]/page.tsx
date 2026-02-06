'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getProject } from '@/lib/client/api'
import { getStatusColor } from '@/lib/client/formatters'
import type { ProjectDetail } from '@/types/project'

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getProject(id)
      .then((res) => setProject(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6">
        <Link
          href="/projects"
          className="font-mono text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to projects
        </Link>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <Link
          href="/projects"
          className="font-mono text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to projects
        </Link>
        <div className="text-sm text-destructive">
          Failed to load project: {error || 'Unknown error'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href="/projects"
        className="font-mono text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to projects
      </Link>

      {/* Project Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="font-mono text-xl">{project.name}</CardTitle>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {project.domain}
                </Badge>
                <Badge
                  variant="outline"
                  className="font-mono text-xs"
                  style={{
                    borderColor: getStatusColor(project.status),
                    color: getStatusColor(project.status),
                  }}
                >
                  {project.status}
                </Badge>
                {project.created && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {project.created}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {project.overview && (
            <div>
              <h3 className="mb-1 font-mono text-xs font-semibold text-muted-foreground">
                Overview
              </h3>
              <p className="text-sm">{project.overview}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Brief Content */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-sm">Brief</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap font-mono text-sm text-muted-foreground">
            {project.content}
          </div>
        </CardContent>
      </Card>

      {/* Project Files */}
      {project.files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-sm">Files</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {project.files.map((file) => (
                <li key={file} className="font-mono text-sm text-muted-foreground">
                  {file}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
