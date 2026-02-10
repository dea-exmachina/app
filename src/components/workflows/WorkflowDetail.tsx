import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Workflow } from '@/types/workflow'
import { TIER_COLORS, TIER_LABELS } from '@/types/architecture'
import { formatDate, getStatusColor } from '@/lib/client/formatters'
import { WorkflowTimeline } from './WorkflowTimeline'
import { WorkflowChain } from './WorkflowChain'

interface WorkflowDetailProps {
  workflow: Workflow
}

export function WorkflowDetail({ workflow }: WorkflowDetailProps) {
  const tierColor = workflow.layer ? TIER_COLORS[workflow.layer] : null
  const tierLabel = workflow.layer ? TIER_LABELS[workflow.layer] : null

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card
        style={tierColor ? { borderTopColor: tierColor.accent, borderTopWidth: 3 } : undefined}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl">{workflow.title}</CardTitle>
              <div className="mt-2 font-mono text-sm text-muted-foreground">
                {workflow.name}
              </div>
            </div>
            <Badge
              variant="outline"
              className="font-mono"
              style={{
                borderColor: getStatusColor(workflow.status),
                color: getStatusColor(workflow.status),
              }}
            >
              {workflow.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Purpose */}
          <div>
            <h3 className="mb-1 font-mono text-xs font-semibold text-muted-foreground">
              Purpose
            </h3>
            <p className="text-sm">{workflow.purpose}</p>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {tierLabel && tierColor && (
              <div>
                <h3 className="mb-1 font-mono text-xs font-semibold text-muted-foreground">
                  Layer
                </h3>
                <Badge
                  variant="outline"
                  className="font-mono"
                  style={{ borderColor: tierColor.accent, color: tierColor.accent }}
                >
                  {tierLabel}
                </Badge>
              </div>
            )}
            <div>
              <h3 className="mb-1 font-mono text-xs font-semibold text-muted-foreground">
                Type
              </h3>
              <Badge variant="secondary" className="font-mono">
                {workflow.workflowType}
              </Badge>
            </div>
            <div>
              <h3 className="mb-1 font-mono text-xs font-semibold text-muted-foreground">
                Trigger
              </h3>
              <p className="text-sm">{workflow.trigger}</p>
            </div>
            {workflow.skill && (
              <div>
                <h3 className="mb-1 font-mono text-xs font-semibold text-muted-foreground">
                  Skill
                </h3>
                <Badge variant="outline" className="font-mono">
                  /{workflow.skill}
                </Badge>
              </div>
            )}
            <div>
              <h3 className="mb-1 font-mono text-xs font-semibold text-muted-foreground">
                Created
              </h3>
              <p className="font-mono text-sm">{formatDate(workflow.created)}</p>
            </div>
          </div>

          {/* File Path */}
          <div>
            <h3 className="mb-1 font-mono text-xs font-semibold text-muted-foreground">
              File Path
            </h3>
            <p className="font-mono text-xs text-muted-foreground">
              {workflow.filePath}
            </p>
          </div>

          {/* Chain Navigation */}
          <WorkflowChain workflow={workflow} />
        </CardContent>
      </Card>

      {/* Prerequisites */}
      {workflow.prerequisites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-sm">Prerequisites</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm">
              {workflow.prerequisites.map((prereq, i) => (
                <li key={i}>{prereq}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Step Timeline */}
      {workflow.sections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-sm">Workflow Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <WorkflowTimeline sections={workflow.sections} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
