'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TaskBrowser } from '@/components/benders/TaskBrowser'
import type { BenderPlatform, BenderTask } from '@/types/bender'
import { getPlatform, getTasks } from '@/lib/client/api'
import { getStatusColor } from '@/lib/client/formatters'

export default function PlatformDetailPage({
  params,
}: {
  params: Promise<{ platform: string }>
}) {
  const { platform: slug } = use(params)
  const [platform, setPlatform] = useState<BenderPlatform | null>(null)
  const [tasks, setTasks] = useState<BenderTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getPlatform(slug), getTasks()])
      .then(([platformRes, tasksRes]) => {
        setPlatform(platformRes.data)
        // Filter tasks for this platform
        const platformTasks = tasksRes.data.filter((task) =>
          task.bender.toLowerCase().includes(slug.toLowerCase())
        )
        setTasks(platformTasks)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="space-y-6">
        <Link
          href="/benders"
          className="font-mono text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to platforms
        </Link>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error || !platform) {
    return (
      <div className="space-y-6">
        <Link
          href="/benders"
          className="font-mono text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to platforms
        </Link>
        <div className="text-sm text-destructive">
          Failed to load platform: {error || 'Unknown error'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href="/benders"
        className="font-mono text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to platforms
      </Link>

      {/* Platform Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl">{platform.name}</CardTitle>
              <div className="mt-2 font-mono text-sm text-muted-foreground">
                {platform.slug}
              </div>
            </div>
            <Badge
              variant="outline"
              className="font-mono"
              style={{
                borderColor: getStatusColor(platform.status),
                color: getStatusColor(platform.status),
              }}
            >
              {platform.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metadata */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <h3 className="mb-1 font-mono text-xs font-semibold text-muted-foreground">
                Interface
              </h3>
              <Badge variant="secondary" className="font-mono">
                {platform.interface}
              </Badge>
            </div>
            <div>
              <h3 className="mb-1 font-mono text-xs font-semibold text-muted-foreground">
                Cost Tier
              </h3>
              <Badge variant="outline" className="font-mono">
                {platform.costTier}
              </Badge>
            </div>
            <div>
              <h3 className="mb-1 font-mono text-xs font-semibold text-muted-foreground">
                Active Tasks
              </h3>
              <p className="font-mono text-sm">{tasks.length}</p>
            </div>
          </div>

          {/* Models */}
          <div>
            <h3 className="mb-2 font-mono text-xs font-semibold text-muted-foreground">
              Models
            </h3>
            <div className="flex flex-wrap gap-2">
              {platform.models.map((model) => (
                <Badge key={model} variant="outline" className="font-mono text-xs">
                  {model}
                </Badge>
              ))}
            </div>
          </div>

          {/* Strengths */}
          {platform.strengths.length > 0 && (
            <div>
              <h3 className="mb-2 font-mono text-xs font-semibold text-muted-foreground">
                Strengths
              </h3>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {platform.strengths.map((strength, i) => (
                  <li key={i}>{strength}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Limitations */}
          {platform.limitations.length > 0 && (
            <div>
              <h3 className="mb-2 font-mono text-xs font-semibold text-muted-foreground">
                Limitations
              </h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {platform.limitations.map((limitation, i) => (
                  <li key={i}>{limitation}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Config & Context */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-1 font-mono text-xs font-semibold text-muted-foreground">
                Config Location
              </h3>
              <p className="font-mono text-xs text-foreground/80">
                {platform.configLocation}
              </p>
            </div>
            <div>
              <h3 className="mb-1 font-mono text-xs font-semibold text-muted-foreground">
                Context Directory
              </h3>
              <p className="font-mono text-xs text-foreground/80">
                {platform.contextDirectory}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks */}
      {tasks.length > 0 && (
        <div>
          <h2 className="mb-4 font-mono text-sm font-semibold text-muted-foreground">
            Platform Tasks
          </h2>
          <TaskBrowser tasks={tasks} />
        </div>
      )}
    </div>
  )
}
