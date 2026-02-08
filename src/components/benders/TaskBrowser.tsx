'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { BenderTask } from '@/types/bender'
import { StatusDot, statusToType } from '@/components/ui/status-dot'
import { SectionDivider } from '@/components/ui/section-divider'
import { formatRelativeDate } from '@/lib/client/formatters'

interface TaskBrowserProps {
  tasks: BenderTask[]
}

const STATUS_TABS = ['all', 'executing', 'delivered', 'integrated'] as const

export function TaskBrowser({ tasks }: TaskBrowserProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered =
    statusFilter === 'all'
      ? tasks
      : tasks.filter((t) => t.status === statusFilter)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <SectionDivider label="Tasks" count={`${tasks.length} total`} />
      </div>

      {/* Status tab filter */}
      <div className="flex gap-1 mb-3 font-mono text-[10px]">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-2 py-0.5 rounded-sm uppercase tracking-wider transition-colors ${
              statusFilter === tab
                ? 'bg-user-accent text-user-accent-fg'
                : 'text-terminal-fg-tertiary hover:text-terminal-fg-secondary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Task table */}
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-[11px]">
          <thead>
            <tr className="border-b border-terminal-border text-terminal-fg-tertiary">
              <th className="pb-1.5 pr-2 text-left font-semibold uppercase tracking-wider w-20">
                ID
              </th>
              <th className="pb-1.5 px-2 text-left font-semibold uppercase tracking-wider">
                Title
              </th>
              <th className="pb-1.5 px-2 text-left font-semibold uppercase tracking-wider w-20">
                Bender
              </th>
              <th className="pb-1.5 px-2 text-left font-semibold uppercase tracking-wider w-24">
                Status
              </th>
              <th className="pb-1.5 px-2 text-left font-semibold uppercase tracking-wider w-12">
                Pri
              </th>
              <th className="pb-1.5 pl-2 text-right font-semibold uppercase tracking-wider w-16">
                Age
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((task) => {
              const reviewMark =
                task.review?.decision === 'ACCEPT'
                  ? ' \u2713'
                  : task.review?.decision === 'PARTIAL'
                    ? ' ~'
                    : task.review?.decision === 'REJECT'
                      ? ' \u2717'
                      : ''

              return (
                <tr
                  key={task.taskId}
                  className="group hover:bg-terminal-bg-elevated/50"
                >
                  <td className="py-1.5 pr-2">
                    <Link
                      href={`/benders/tasks/${task.taskId}`}
                      className="text-user-accent hover:underline"
                    >
                      {task.taskId}
                    </Link>
                  </td>
                  <td className="py-1.5 px-2 text-terminal-fg-primary truncate max-w-[300px]">
                    <Link href={`/benders/tasks/${task.taskId}`}>
                      {task.title}
                    </Link>
                  </td>
                  <td className="py-1.5 px-2 text-terminal-fg-secondary">
                    {task.bender}
                  </td>
                  <td className="py-1.5 px-2">
                    <span className="flex items-center gap-1">
                      <StatusDot
                        status={statusToType(task.status)}
                        size={5}
                      />
                      <span className="text-terminal-fg-secondary">
                        {task.status}
                        {reviewMark}
                      </span>
                    </span>
                  </td>
                  <td className="py-1.5 px-2">
                    {task.priority === 'focus' ? (
                      <span className="text-status-warn">focus</span>
                    ) : (
                      <span className="text-terminal-fg-tertiary">norm</span>
                    )}
                  </td>
                  <td className="py-1.5 pl-2 text-right text-terminal-fg-tertiary">
                    {formatRelativeDate(task.created)}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-4 text-center text-terminal-fg-tertiary"
                >
                  No tasks match filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
