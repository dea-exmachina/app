'use client'

import { useState } from 'react'
import { SectionDivider } from '@/components/ui/section-divider'
import { StatusDot, statusToType } from '@/components/ui/status-dot'
import { TerminalTable, type TerminalColumn } from '@/components/ui/terminal-table'
import { BenderDetailPanel } from '@/components/benders/BenderDetailPanel'

interface BenderRow {
  platform: string
  slug?: string
  status: string
  activeTasks: number
  taskId?: string
}

interface ActiveBendersProps {
  benders: BenderRow[]
}

export function ActiveBendersTable({ benders }: ActiveBendersProps) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const activeCount = benders.filter(
    (b) => b.status.toLowerCase() !== 'idle'
  ).length

  const columns: TerminalColumn<BenderRow>[] = [
    {
      key: 'platform',
      label: 'Name',
      render: (row) => (
        <button
          onClick={() => {
            const slug = row.slug || row.platform.toLowerCase().replace(/\s+/g, '-')
            setSelectedSlug(slug)
          }}
          className="text-terminal-fg-primary hover:text-user-accent transition-colors text-left"
        >
          {row.platform}
        </button>
      ),
    },
    {
      key: 'taskId',
      label: 'Task',
      render: (row) => (
        <span className="terminal-id">
          {row.taskId || (row.activeTasks > 0 ? `${row.activeTasks} active` : '—')}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <StatusDot status={statusToType(row.status)} label={row.status} />
      ),
    },
  ]

  return (
    <div>
      <SectionDivider label="Benders" count={`${activeCount} active`} />
      <TerminalTable
        columns={columns}
        data={benders}
        getRowKey={(row) => row.platform}
        compact
        className="mt-1"
      />
      {selectedSlug && (
        <BenderDetailPanel
          slug={selectedSlug}
          onClose={() => setSelectedSlug(null)}
        />
      )}
    </div>
  )
}

// Keep old export for backward compat
export function BenderStatusWidget({
  benders,
}: {
  benders: BenderRow[]
}) {
  return <ActiveBendersTable benders={benders} />
}
