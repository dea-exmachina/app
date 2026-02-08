import { StatusDot } from '@/components/ui/status-dot'
import type { BenderTask } from '@/types/bender'

interface ReviewDecisionProps {
  review: BenderTask['review']
}

export function ReviewDecision({ review }: ReviewDecisionProps) {
  if (!review) return null

  const statusMap = {
    ACCEPT: 'ok' as const,
    PARTIAL: 'warn' as const,
    REJECT: 'error' as const,
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-terminal-fg-tertiary">
          Review
        </span>
        <StatusDot
          status={statusMap[review.decision]}
          label={review.decision}
          size={5}
        />
      </div>
      <p className="font-mono text-[11px] text-terminal-fg-secondary">
        {review.feedback}
      </p>
    </div>
  )
}
