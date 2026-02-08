'use client'

import { StatusDot } from '@/components/ui/status-dot'

interface TickerProps {
  openCards: number
  blockers: number
  boardCompletion: number
  inboxPending: number
  benderActive: number
  benderTotal: number
}

export function TickerBar({
  openCards,
  blockers,
  boardCompletion,
  inboxPending,
  benderActive,
  benderTotal,
}: TickerProps) {
  return (
    <div className="flex items-center gap-0 h-full font-mono">
      <TickerStat label="OPEN" value={openCards} />
      <TickerDivider />
      <TickerStat
        label="BLOCKED"
        value={blockers}
        dot={blockers > 0 ? 'error' : undefined}
      />
      <TickerDivider />
      <TickerStat label="BOARDS" value={`${boardCompletion}%`} suffix="avg" />
      <TickerDivider />
      <TickerStat label="INBOX" value={inboxPending} />
      <TickerDivider />
      <TickerStat
        label="BENDERS"
        value={`${benderActive}/${benderTotal}`}
      />
    </div>
  )
}

function TickerStat({
  label,
  value,
  suffix,
  dot,
}: {
  label: string
  value: string | number
  suffix?: string
  dot?: 'ok' | 'warn' | 'error' | 'info'
}) {
  return (
    <div className="flex flex-col items-start px-3 py-1">
      <span className="terminal-label">{label}</span>
      <span className="flex items-center gap-1.5">
        {dot && <StatusDot status={dot} size={5} />}
        <span className="terminal-value text-[14px]">{value}</span>
        {suffix && (
          <span className="text-[11px] text-terminal-fg-tertiary">{suffix}</span>
        )}
      </span>
    </div>
  )
}

function TickerDivider() {
  return <div className="w-px h-6 bg-terminal-border-strong shrink-0" />
}

// Keep QuickStats export for backward compat during migration
export function QuickStats({
  boardCount,
  skillCount,
  workflowCount,
  benderCount,
}: {
  boardCount: number
  skillCount: number
  workflowCount: number
  benderCount: number
}) {
  return (
    <TickerBar
      openCards={0}
      blockers={0}
      boardCompletion={0}
      inboxPending={0}
      benderActive={0}
      benderTotal={benderCount}
    />
  )
}
