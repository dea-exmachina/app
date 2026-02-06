'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { WorkflowDetail } from '@/components/workflows/WorkflowDetail'
import type { Workflow } from '@/types/workflow'
import { getWorkflow } from '@/lib/client/api'

export default function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = use(params)
  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getWorkflow(name)
      .then((res) => setWorkflow(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [name])

  if (loading) {
    return (
      <div className="space-y-6">
        <Link
          href="/workflows"
          className="font-mono text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to workflows
        </Link>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error || !workflow) {
    return (
      <div className="space-y-6">
        <Link
          href="/workflows"
          className="font-mono text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to workflows
        </Link>
        <div className="text-sm text-destructive">
          Failed to load workflow: {error || 'Unknown error'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href="/workflows"
        className="font-mono text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to workflows
      </Link>
      <WorkflowDetail workflow={workflow} />
    </div>
  )
}
