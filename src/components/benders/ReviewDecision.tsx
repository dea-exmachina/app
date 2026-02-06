import { Badge } from '@/components/ui/badge'
import type { BenderTask } from '@/types/bender'

interface ReviewDecisionProps {
  review: BenderTask['review']
}

export function ReviewDecision({ review }: ReviewDecisionProps) {
  if (!review) return null

  const decisionColors = {
    ACCEPT: { border: '#7BAD8E', color: '#7BAD8E' },
    PARTIAL: { border: '#DDCBAD', color: '#DDCBAD' },
    REJECT: { border: '#AD7B7B', color: '#AD7B7B' },
  }

  const colors = decisionColors[review.decision]

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="font-mono text-sm font-semibold text-muted-foreground">
          Review Decision
        </h3>
        <Badge
          variant="outline"
          className="font-mono"
          style={{
            borderColor: colors.border,
            color: colors.color,
          }}
        >
          {review.decision}
        </Badge>
      </div>
      <p className="text-sm text-foreground/90">{review.feedback}</p>
    </div>
  )
}
