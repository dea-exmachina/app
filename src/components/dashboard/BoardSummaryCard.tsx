'use client'

import Link from 'next/link'
import { SectionDivider } from '@/components/ui/section-divider'
import { InlineProgressBar } from '@/components/ui/sparkline'
import { TerminalTable, type TerminalColumn } from '@/components/ui/terminal-table'
import type { BoardSummary } from '@/types/kanban'

interface BoardSummaryTableProps {
  boards: BoardSummary[]
}

export function BoardSummaryTable({ boards }: BoardSummaryTableProps) {
  const columns: TerminalColumn<BoardSummary>[] = [
    {
      key: 'name',
      label: 'Board',
      sortable: true,
      render: (row) => (
        <Link
          href={`/kanban/${row.id}`}
          className="text-terminal-fg-primary hover:text-user-accent transition-colors"
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: 'totalOpen',
      label: 'Open',
      width: '60px',
      align: 'right',
      sortable: true,
    },
    {
      key: 'totalCompleted',
      label: 'Done',
      width: '60px',
      align: 'right',
      sortable: true,
    },
    {
      key: 'progress',
      label: 'Progress',
      width: '120px',
      render: (row) => {
        const total = row.totalOpen + row.totalCompleted
        const pct = total > 0 ? Math.round((row.totalCompleted / total) * 100) : 0
        return (
          <span className="flex items-center gap-2">
            <InlineProgressBar
              value={pct}
              width={60}
              height={8}
              color={pct > 60 ? 'var(--status-ok)' : pct > 30 ? 'var(--status-warn)' : 'var(--terminal-fg-tertiary)'}
            />
            <span className="text-[10px] text-terminal-fg-secondary w-8 text-right">
              {pct}%
            </span>
          </span>
        )
      },
    },
  ]

  return (
    <div>
      <SectionDivider label="Boards" />
      <TerminalTable
        columns={columns}
        data={boards}
        getRowKey={(row) => row.id}
        compact
        className="mt-1"
      />
    </div>
  )
}

// Keep old export for backward compat
export function BoardSummaryCard({ board }: { board: BoardSummary }) {
  return (
    <BoardSummaryTable boards={[board]} />
  )
}
