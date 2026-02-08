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

  return (
    <div className="p-4 space-y-3">
      {/* Nav bar */}
      <div className="flex items-center gap-3 font-mono text-[11px] border-b border-terminal-border pb-2">
        <Link
          href="/benders"
          className="text-terminal-fg-tertiary hover:text-user-accent transition-colors"
        >
          BENDERS
        </Link>
        <span className="text-terminal-fg-tertiary">/</span>
        <Link
          href="/benders/tasks"
          className="text-terminal-fg-tertiary hover:text-user-accent transition-colors"
        >
          TASKS
        </Link>
        <span className="text-terminal-fg-tertiary">/</span>
        <span className="font-semibold text-terminal-fg-primary">{taskId}</span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="font-mono text-[11px] text-terminal-fg-tertiary">
          Loading...
        </div>
      ) : error || !task ? (
        <div className="font-mono text-[11px] text-status-error">
          Failed to load task: {error || 'Unknown error'}
        </div>
      ) : (
        <TaskDetail task={task} />
      )}
    </div>
  )
}
