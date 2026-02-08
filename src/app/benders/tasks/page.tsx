'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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

  return (
    <div className="p-4 space-y-3">
      {/* Nav bar */}
      <div className="flex items-center justify-between border-b border-terminal-border pb-2">
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <Link
            href="/benders"
            className="text-terminal-fg-tertiary hover:text-user-accent transition-colors"
          >
            BENDERS
          </Link>
          <span className="text-terminal-fg-tertiary">/</span>
          <span className="font-semibold uppercase tracking-wider text-terminal-fg-primary">
            Tasks
          </span>
        </div>
        <Link
          href="/benders/tasks/new"
          className="font-mono text-[10px] px-2 py-0.5 rounded-sm bg-user-accent text-user-accent-fg hover:opacity-90 transition-opacity"
        >
          + NEW
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="font-mono text-[11px] text-terminal-fg-tertiary">
          Loading...
        </div>
      ) : error || !tasks ? (
        <div className="font-mono text-[11px] text-status-error">
          Failed to load tasks: {error || 'Unknown error'}
        </div>
      ) : (
        <TaskBrowser tasks={tasks} />
      )}
    </div>
  )
}
