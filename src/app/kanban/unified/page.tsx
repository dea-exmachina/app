import { Suspense } from 'react'
import { UnifiedBoardView } from '@/components/kanban/UnifiedBoardView'
import { BenderBoardView } from '@/components/kanban/BenderBoardView'
import { HistorySearchWrapper } from '@/components/kanban/HistorySearchWrapper'

export default function UnifiedBoardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kanban</h1>
        <p className="text-sm text-muted-foreground">
          All cards across all projects in one view
        </p>
      </div>
      <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
        <UnifiedBoardView />
      </Suspense>

      <Suspense fallback={<div className="text-muted-foreground">Loading bender board...</div>}>
        <BenderBoardView />
      </Suspense>

      <div className="border-t border-terminal-border pt-6">
        <div className="mb-4">
          <h2 className="font-mono text-[14px] font-semibold uppercase tracking-wider text-terminal-fg-primary">
            Card History
          </h2>
          <p className="font-mono text-[11px] text-terminal-fg-tertiary mt-1">
            Search across all cards. Re-open, file bugs, or branch new tasks.
          </p>
        </div>
        <Suspense fallback={<div className="font-mono text-[11px] text-terminal-fg-tertiary">Loading…</div>}>
          <HistorySearchWrapper />
        </Suspense>
      </div>
    </div>
  )
}
