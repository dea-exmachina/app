import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Workflow } from '@/types/workflow'
import { TIER_COLORS, TIER_LABELS } from '@/types/architecture'
import { getStatusColor } from '@/lib/client/formatters'

interface WorkflowCardProps {
  workflow: Workflow
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  const tierColor = workflow.layer ? TIER_COLORS[workflow.layer] : null
  const tierLabel = workflow.layer ? TIER_LABELS[workflow.layer] : null

  return (
    <Link href={`/workflows/${workflow.name}`}>
      <Card
        className="h-full transition-colors hover:border-primary/50"
        style={tierColor ? { borderLeftColor: tierColor.accent, borderLeftWidth: 3 } : undefined}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-sm font-semibold">
                {workflow.title}
              </CardTitle>
              <div className="mt-1 font-mono text-xs text-muted-foreground">
                {workflow.name}
              </div>
            </div>
            <Badge
              variant="outline"
              className="shrink-0 font-mono text-xs"
              style={{
                borderColor: getStatusColor(workflow.status),
                color: getStatusColor(workflow.status),
              }}
            >
              {workflow.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">{workflow.purpose}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            {tierLabel && tierColor && (
              <Badge
                variant="outline"
                className="font-mono text-xs"
                style={{ borderColor: tierColor.accent, color: tierColor.accent }}
              >
                {tierLabel}
              </Badge>
            )}
            <Badge variant="secondary" className="font-mono text-xs">
              {workflow.workflowType}
            </Badge>
            {workflow.skill && (
              <Badge variant="outline" className="font-mono text-xs">
                /{workflow.skill}
              </Badge>
            )}
            {workflow.chainNext && (
              <span className="font-mono text-xs text-muted-foreground" title="Part of a workflow chain">
                chain &rarr;
              </span>
            )}
          </div>
          <div className="pt-1 text-xs text-muted-foreground">
            <span className="font-mono">Trigger:</span> {workflow.trigger}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
