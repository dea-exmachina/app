'use client'

import { useState, useMemo } from 'react'
import type { Workflow } from '@/types/workflow'
import type { ArchitectureTier } from '@/types/architecture'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TierFilter } from '@/components/shared/TierFilter'
import { WorkflowCard } from './WorkflowCard'

interface WorkflowListProps {
  workflows: Workflow[]
}

export function WorkflowList({ workflows }: WorkflowListProps) {
  const [search, setSearch] = useState('')
  const [layerFilter, setLayerFilter] = useState<ArchitectureTier | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Filter chain: search → layer → type → status
  const filtered = useMemo(() => {
    let result = workflows

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (w) =>
          w.title.toLowerCase().includes(q) ||
          w.name.toLowerCase().includes(q) ||
          w.purpose.toLowerCase().includes(q)
      )
    }

    if (layerFilter) {
      result = result.filter((w) => w.layer === layerFilter)
    }

    if (typeFilter !== 'all') {
      result = result.filter((w) => w.workflowType === typeFilter)
    }

    if (statusFilter !== 'all') {
      result = result.filter((w) => w.status === statusFilter)
    }

    return result
  }, [workflows, search, layerFilter, typeFilter, statusFilter])

  // Compute tier counts from full list (before layer filter)
  const tierCounts = useMemo(() => {
    const counts: Partial<Record<ArchitectureTier | 'all', number>> = {
      all: workflows.length,
    }
    for (const w of workflows) {
      if (w.layer) {
        counts[w.layer] = (counts[w.layer] ?? 0) + 1
      }
    }
    return counts
  }, [workflows])

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="text"
        placeholder="Search workflows..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <TierFilter
          selectedTier={layerFilter}
          onTierChange={setLayerFilter}
          counts={tierCounts}
        />

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
