'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { TaskBrowser } from '@/components/benders/TaskBrowser'
import type { BenderTask } from '@/types/bender'
import { getTasks } from '@/lib/client/api'

export default function TasksPage() {
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
      <div className="space-y-6">
        <Link
          href="/benders"
          className="font-mono text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to benders
        </Link>
        <Header title="Tasks" description="Bender task browser with filters" />
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error || !tasks) {
    return (
      <div className="space-y-6">
        <Link
          href="/benders"
          className="font-mono text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to benders
        </Link>
        <Header title="Tasks" description="Bender task browser with filters" />
        <div className="text-sm text-destructive">
          Failed to load tasks: {error || 'Unknown error'}
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
        ← Back to benders
      </Link>
      <Header title="Tasks" description="Bender task browser with filters" />
      <TaskBrowser tasks={tasks} />
    </div>
  )
}
