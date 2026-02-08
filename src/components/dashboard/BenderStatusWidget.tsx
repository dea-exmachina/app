'use client'

import { SectionDivider } from '@/components/ui/section-divider'
import { StatusDot, statusToType } from '@/components/ui/status-dot'
import { TerminalTable, type TerminalColumn } from '@/components/ui/terminal-table'

interface BenderRow {
  platform: string
  status: string
  activeTasks: number
  taskId?: string
}

interface ActiveBendersProps {
  benders: BenderRow[]
}

export function ActiveBendersTable({ benders }: ActiveBendersProps) {
  const activeCount = benders.filter(
    (b) => b.status.toLowerCase() !== 'idle'
  ).length

  const columns: TerminalColumn<BenderRow>[] = [
    {
      key: 'platform',
      label: 'Name',
      render: (row) => (
        <span className="text-terminal-fg-primary">{row.platform}</span>
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
