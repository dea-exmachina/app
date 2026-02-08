'use client'

import { SectionDivider } from '@/components/ui/section-divider'
import { StatusDot } from '@/components/ui/status-dot'
import type { HandoffSection } from '@/types/kanban'
import { formatRelativeDate } from '@/lib/client/formatters'

interface MissionBriefingProps {
  handoff: HandoffSection | null
}

export function MissionBriefing({ handoff }: MissionBriefingProps) {
  if (!handoff) {
    return (
      <div className="p-3">
        <SectionDivider label="Mission Briefing" />
        <p className="mt-2 font-mono text-xs text-terminal-fg-tertiary">
          No handoff data available.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <SectionDivider
        label="Mission Briefing"
        right={`updated ${formatRelativeDate(handoff.updated)}`}
      />

      {/* Key-value pairs */}
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 font-mono text-xs px-1">
        <span className="text-terminal-fg-secondary">PROJECT</span>
        <span className="text-terminal-fg-primary">{handoff.whereWeLeftOff.project}</span>
        <span className="text-terminal-fg-secondary">STATE</span>
        <span className="text-terminal-fg-primary">{handoff.whereWeLeftOff.state}</span>
        {handoff.whereWeLeftOff.location && (
          <>
            <span className="text-terminal-fg-secondary">LOCATION</span>
            <span className="text-terminal-fg-tertiary">{handoff.whereWeLeftOff.location}</span>
          </>
        )}
      </div>

      {/* Context */}
      {handoff.context && (
        <p className="terminal-body text-xs leading-relaxed px-1 text-terminal-fg-secondary">
          {handoff.context}
        </p>
      )}

      {/* Next Items */}
      {handoff.nextItems.length > 0 && (
        <div>
          <SectionDivider label="Next" />
          <ol className="mt-1 space-y-0.5 px-1">
            {handoff.nextItems.map((item, i) => (
              <li key={i} className="font-mono text-xs text-terminal-fg-primary flex gap-2">
                <span className="text-terminal-fg-tertiary shrink-0">{i + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Blockers */}
      {handoff.blockers.length > 0 && (
        <div>
          <SectionDivider
            label="Blockers"
            count={`${handoff.blockers.length} active`}
          />
          <ul className="mt-1 space-y-0.5 px-1">
            {handoff.blockers.map((blocker, i) => (
              <li key={i} className="flex items-start gap-1.5 font-mono text-xs">
                <StatusDot status="error" size={5} className="mt-1 shrink-0" />
                <span className="text-status-error">{blocker}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
