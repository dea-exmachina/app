'use client'

import { Badge } from '@/components/ui/badge'
import { TerminalTable, type TerminalColumn } from '@/components/ui/terminal-table'
import { useProjectDashboardContext } from './ProjectDashboardProvider'
import type { NexusCard } from '@/types/nexus'

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-status-error',
  high: 'text-status-warn',
  normal: 'text-terminal-fg-primary',
  low: 'text-terminal-fg-tertiary',
}

const columns: TerminalColumn<NexusCard>[] = [
  {
    key: 'card_id',
    label: 'ID',
    width: '15%',
    render: (row) => (
      <span className="font-mono text-user-accent">{row.card_id}</span>
    ),
  },
  {
    key: 'title',
    label: 'TITLE',
    width: '40%',
    render: (row) => (
      <span className="text-terminal-fg-primary truncate block">{row.title}</span>
    ),
  },
  {
    key: 'priority',
    label: 'PRI',
    width: '12%',
    render: (row) => (
      <span className={`font-mono uppercase ${PRIORITY_COLORS[row.priority] || ''}`}>
        {row.priority}
      </span>
    ),
  },
  {
    key: 'lane',
    label: 'LANE',
    width: '18%',
    render: (row) => (
      <Badge variant="terminal">{row.lane.replace('_', ' ')}</Badge>
    ),
  },
  {
    key: 'delegation_tag',
    label: 'TAG',
    width: '15%',
    render: (row) => (
      <Badge variant="terminal">{row.delegation_tag}</Badge>
    ),
  },
]

export function ProjectTaskListWidget() {
  const { data } = useProjectDashboardContext()

  if (!data.nexusProject) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono text-terminal-fg-tertiary">
        No kanban board linked
      </div>
    )
  }

  if (data.openCards.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono text-terminal-fg-tertiary">
        No open tasks
      </div>
    )
  }

  const displayCards = data.openCards.slice(0, 15)

  return (
    <div className="h-full flex flex-col">
      <TerminalTable
        columns={columns}
        data={displayCards}
        getRowKey={(row) => row.id}
        compact
        className="flex-1"
      />
      {data.openCards.length > 15 && (
        <div className="pt-2 text-center">
          <span className="font-mono text-[10px] text-terminal-fg-tertiary">
            +{data.openCards.length - 15} more cards
          </span>
        </div>
      )}
    </div>
  )
}
