import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Workflow } from '@/types/workflow'
import { getStatusColor } from '@/lib/client/formatters'

interface WorkflowCardProps {
  workflow: Workflow
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  return (
    <Link href={`/workflows/${workflow.name}`}>
      <Card className="h-full transition-colors hover:border-primary/50">
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
            <Badge variant="secondary" className="font-mono text-xs">
              {workflow.workflowType}
            </Badge>
            {workflow.skill && (
              <Badge variant="outline" className="font-mono text-xs">
                /{workflow.skill}
              </Badge>
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
