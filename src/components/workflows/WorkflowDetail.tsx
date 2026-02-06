import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Workflow } from '@/types/workflow'
import { formatDate, getStatusColor } from '@/lib/client/formatters'

interface WorkflowDetailProps {
  workflow: Workflow
}

export function WorkflowDetail({ workflow }: WorkflowDetailProps) {
  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
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

      {/* Sections */}
      {workflow.sections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-sm">Workflow Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {workflow.sections.map((section, i) => (
              <div key={i}>
                <h3
                  className={`mb-2 font-semibold ${
                    section.level === 2
                      ? 'text-base'
                      : section.level === 3
                        ? 'text-sm'
                        : 'text-xs'
                  }`}
                >
                  {section.heading}
                </h3>
                <div className="prose prose-sm prose-invert max-w-none">
                  <div
                    className="text-sm text-muted-foreground whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
