'use client'

import { Badge } from '@/components/ui/badge'
import { StatusDot, statusToType } from '@/components/ui/status-dot'
import { TerminalTable, type TerminalColumn } from '@/components/ui/terminal-table'
import { useProjectDashboardContext } from './ProjectDashboardProvider'
import type { ProjectTeamMember } from '@/types/project'

const columns: TerminalColumn<ProjectTeamMember>[] = [
  {
    key: 'display_name',
    label: 'BENDER',
    width: '35%',
    render: (row) => (
      <span className="font-mono text-terminal-fg-primary">{row.display_name}</span>
    ),
  },
  {
    key: 'role',
    label: 'ROLE',
    width: '25%',
    render: (row) => (
      <span className="text-terminal-fg-secondary">{row.role || '—'}</span>
    ),
  },
  {
    key: 'status',
    label: 'STATUS',
    width: '20%',
    render: (row) => (
      <StatusDot status={statusToType(row.status)} label={row.status || 'idle'} />
    ),
  },
  {
    key: 'expertise',
    label: 'EXPERTISE',
    width: '20%',
    render: (row) => (
      <div className="flex flex-wrap gap-0.5">
        {(row.expertise || []).slice(0, 3).map((e) => (
          <Badge key={e} variant="terminal">{e}</Badge>
        ))}
      </div>
    ),
  },
]

export function ProjectTeamWidget() {
  const { data } = useProjectDashboardContext()

  if (data.teamMembers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono text-terminal-fg-tertiary">
        No benders assigned
      </div>
    )
  }

  return (
    <TerminalTable
      columns={columns}
      data={data.teamMembers}
      getRowKey={(row) => row.identity_id}
      compact
    />
  )
}
