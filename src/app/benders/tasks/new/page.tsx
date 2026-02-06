'use client'

import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { TaskComposer } from '@/components/benders/TaskComposer'

export default function NewTaskPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/benders/tasks"
        className="font-mono text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to tasks
      </Link>
      <Header
        title="Create Task"
        description="Define a new bender task brief"
      />
      <TaskComposer />
    </div>
  )
}
