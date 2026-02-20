import { Suspense } from 'react'
import { HistorySearchWrapper } from '@/components/kanban/HistorySearchWrapper'

export default function HistoryPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-mono text-[14px] font-semibold uppercase tracking-wider text-terminal-fg-primary">
          Card History
        </h1>
        <p className="font-mono text-[11px] text-terminal-fg-tertiary mt-1">
          Search across all cards. Re-open, file bugs, or branch new tasks.
        </p>
      </div>
      <Suspense fallback={<div className="font-mono text-[11px] text-terminal-fg-tertiary">Loading…</div>}>
        <HistorySearchWrapper />
      </Suspense>
    </div>
  )
}
