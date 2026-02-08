'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { StatusDot, statusToType } from '@/components/ui/status-dot'
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
      <div className="font-mono text-[11px] text-terminal-fg-tertiary">
        Loading tasks...
      </div>
    )
  }

  if (error || !tasks) {
    return (
      <div className="font-mono text-[11px] text-status-error">
        Failed to load tasks: {error || 'Unknown error'}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="font-mono text-[11px] text-terminal-fg-tertiary">
        No tasks found
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {tasks.slice(0, 10).map((task) => (
        <Link
          key={task.taskId}
          href={`/benders/tasks/${task.taskId}`}
          className="flex items-center gap-2 py-1 px-1 rounded-sm font-mono text-[11px] hover:bg-terminal-bg-elevated/50 transition-colors"
        >
          <span className="text-user-accent shrink-0 w-16">{task.taskId}</span>
          <span className="text-terminal-fg-primary truncate flex-1">
            {task.title}
          </span>
          <StatusDot status={statusToType(task.status)} size={5} />
          <span className="text-terminal-fg-tertiary shrink-0 w-14 text-right">
            {formatRelativeDate(task.created)}
          </span>
        </Link>
      ))}
      {tasks.length > 10 && (
        <Link
          href="/benders/tasks"
          className="block px-1 pt-1 font-mono text-[10px] text-terminal-fg-tertiary hover:text-user-accent transition-colors"
        >
          +{tasks.length - 10} more →
        </Link>
      )}
    </div>
  )
}
