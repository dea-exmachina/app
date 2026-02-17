'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { TaskBrowser } from '@/components/benders/TaskBrowser'
import { InlineTaskComposer } from '@/components/benders/InlineTaskComposer'
import type { BenderTask } from '@/types/bender'
import { getTasks } from '@/lib/client/api'

export default function TasksPage() {
  const [tasks, setTasks] = useState<BenderTask[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(() => {
    setLoading(true)
    getTasks()
      .then((res) => setTasks(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const handleTaskCreated = useCallback(() => {
    fetchTasks()
  }, [fetchTasks])

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
      </div>

      {/* Inline Task Composer */}
      <InlineTaskComposer onCreated={handleTaskCreated} />

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
