'use client'

import { Header } from '@/components/layout/Header'
import { WorkflowList } from '@/components/workflows/WorkflowList'
import { useWorkflows } from '@/hooks/useWorkflows'

export default function WorkflowsPage() {
  const { data: workflows, loading, error } = useWorkflows()

  if (loading) {
    return (
      <div className="space-y-6">
        <Header
          title="Workflows"
          description="Filterable workflow list with full content"
        />
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error || !workflows) {
    return (
      <div className="space-y-6">
        <Header
          title="Workflows"
          description="Filterable workflow list with full content"
        />
        <div className="text-sm text-destructive">
          Failed to load workflows: {error || 'Unknown error'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Header
        title="Workflows"
        description="Filterable workflow list with full content"
      />
      <WorkflowList workflows={workflows} />
    </div>
  )
}
