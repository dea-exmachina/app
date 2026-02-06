'use client'

import { useState } from 'react'
import type { Workflow } from '@/types/workflow'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { WorkflowCard } from './WorkflowCard'

interface WorkflowListProps {
  workflows: Workflow[]
}

export function WorkflowList({ workflows }: WorkflowListProps) {
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Filter workflows
  let filtered = workflows

  if (typeFilter !== 'all') {
    filtered = filtered.filter((w) => w.workflowType === typeFilter)
  }

  if (statusFilter !== 'all') {
    filtered = filtered.filter((w) => w.status === statusFilter)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList variant="line">
            <TabsTrigger value="all">All Types</TabsTrigger>
            <TabsTrigger value="goal">Goal</TabsTrigger>
            <TabsTrigger value="explicit">Explicit</TabsTrigger>
            <TabsTrigger value="goal-oriented">Goal-Oriented</TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList variant="line">
            <TabsTrigger value="all">All Status</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="deprecated">Deprecated</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Results Count */}
      <div className="font-mono text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? 'workflow' : 'workflows'}
      </div>

      {/* Workflow Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No workflows match the selected filters
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((workflow) => (
            <WorkflowCard key={workflow.name} workflow={workflow} />
          ))}
        </div>
      )}
    </div>
  )
}
