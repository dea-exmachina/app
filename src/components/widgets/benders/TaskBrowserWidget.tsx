'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { getTasks } from '@/lib/client/api'
import { formatRelativeDate } from '@/lib/client/formatters'
import type { BenderTask } from '@/types/bender'

export function TaskBrowserWidget() {
  const [tasks, setTasks] = useState<BenderTask[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getTasks()
      .then((res) => setTasks(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (error || !tasks) {
    return (
      <div className="text-sm text-destructive">
        Failed to load tasks: {error || 'Unknown error'}
      </div>
    )
  }

  if (tasks.length === 0) {
    return <div className="text-sm text-muted-foreground">No tasks found</div>
  }

  return (
    <div className="space-y-2">
      {tasks.slice(0, 10).map((task) => (
        <Link
          key={task.taskId}
          href={`/benders/tasks/${task.taskId}`}
          className="block rounded-md border border-border bg-muted/30 p-3 transition-colors hover:border-primary/50"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="font-mono text-xs text-muted-foreground">
                {task.taskId}
              </div>
              <div className="text-sm font-medium">{task.title}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{task.bender}</span>
                <span>•</span>
                <span>{formatRelativeDate(task.created)}</span>
              </div>
            </div>
            <Badge variant="outline" className="shrink-0 font-mono">
              {task.status}
            </Badge>
          </div>
        </Link>
      ))}
      {tasks.length > 10 && (
        <Link
          href="/benders/tasks"
          className="block pt-2 font-mono text-xs text-primary hover:underline"
        >
          View all {tasks.length} tasks →
        </Link>
      )}
    </div>
  )
}
