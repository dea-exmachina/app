'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { TaskDetail } from '@/components/benders/TaskDetail'
import type { BenderTask } from '@/types/bender'
import { getTask } from '@/lib/client/api'

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>
}) {
  const { taskId } = use(params)
  const [task, setTask] = useState<BenderTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getTask(taskId)
      .then((res) => setTask(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [taskId])

  if (loading) {
    return (
      <div className="space-y-6">
        <Link
          href="/benders/tasks"
          className="font-mono text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to tasks
        </Link>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="space-y-6">
        <Link
          href="/benders/tasks"
          className="font-mono text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to tasks
        </Link>
        <div className="text-sm text-destructive">
          Failed to load task: {error || 'Unknown error'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href="/benders/tasks"
        className="font-mono text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to tasks
      </Link>
      <TaskDetail task={task} />
    </div>
  )
}
