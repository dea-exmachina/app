'use client'

import { WorkflowList } from '@/components/workflows/WorkflowList'
import { Skeleton } from '@/components/ui/skeleton'
import { useWorkflows } from '@/hooks/useWorkflows'

export function WorkflowListWidget() {
  const { data: workflows, loading, error } = useWorkflows()

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (error || !workflows) {
    return (
      <div className="text-sm text-destructive">
        Failed to load workflows: {error || 'Unknown error'}
      </div>
    )
  }

  return <WorkflowList workflows={workflows} />
}
