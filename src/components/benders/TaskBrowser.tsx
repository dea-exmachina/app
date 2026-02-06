'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { BenderTask } from '@/types/bender'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { getStatusColor, formatDate } from '@/lib/client/formatters'

interface TaskBrowserProps {
  tasks: BenderTask[]
}

export function TaskBrowser({ tasks }: TaskBrowserProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  // Filter tasks
  let filtered = tasks

  if (statusFilter !== 'all') {
    filtered = filtered.filter((t) => t.status === statusFilter)
  }

  if (priorityFilter !== 'all') {
    filtered = filtered.filter((t) => t.priority === priorityFilter)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList variant="line">
            <TabsTrigger value="all">All Status</TabsTrigger>
            <TabsTrigger value="proposed">Proposed</TabsTrigger>
            <TabsTrigger value="executing">Executing</TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
            <TabsTrigger value="integrated">Integrated</TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs value={priorityFilter} onValueChange={setPriorityFilter}>
          <TabsList variant="line">
            <TabsTrigger value="all">All Priority</TabsTrigger>
            <TabsTrigger value="focus">Focus</TabsTrigger>
            <TabsTrigger value="normal">Normal</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Results Count */}
      <div className="font-mono text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? 'task' : 'tasks'}
      </div>

      {/* Task List */}
      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No tasks match the selected filters
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <Link
              key={task.taskId}
              href={`/benders/tasks/${task.taskId}`}
              className="block"
            >
              <div className="flex items-start gap-4 rounded-md border border-border bg-card p-4 transition-colors hover:border-primary/50">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {task.taskId}
                    </span>
                    <Badge
                      variant="outline"
                      className="font-mono text-xs"
                      style={{
                        borderColor: getStatusColor(task.status),
                        color: getStatusColor(task.status),
                      }}
                    >
                      {task.status}
                    </Badge>
                    {task.priority === 'focus' && (
                      <Badge
                        variant="outline"
                        className="font-mono text-xs"
                        style={{
                          borderColor: '#AD7B7B',
                          color: '#AD7B7B',
                        }}
                      >
                        focus
                      </Badge>
                    )}
                  </div>
                  <h3 className="mb-1 text-sm font-semibold">{task.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-mono">
                      Bender: {task.bender}
                    </span>
                    <span className="font-mono">
                      Created: {formatDate(task.created)}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
