import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { BenderTask } from '@/types/bender'
import { formatDate, getStatusColor } from '@/lib/client/formatters'
import { ReviewDecision } from './ReviewDecision'

interface TaskDetailProps {
  task: BenderTask
}

export function TaskDetail({ task }: TaskDetailProps) {
  const priorityColor = task.priority === 'focus' ? '#AD7B7B' : '#9B8E7B'

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="mb-2 font-mono text-sm text-muted-foreground">
                {task.taskId}
              </div>
              <CardTitle className="text-xl">{task.title}</CardTitle>
            </div>
            <div className="flex flex-col gap-2">
              <Badge
                variant="outline"
                className="font-mono"
                style={{
                  borderColor: getStatusColor(task.status),
                  color: getStatusColor(task.status),
                }}
              >
                {task.status}
              </Badge>
              <Badge
                variant="outline"
                className="font-mono text-xs"
                style={{
                  borderColor: priorityColor,
                  color: priorityColor,
                }}
              >
                {task.priority}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overview */}
          <div>
            <h3 className="mb-1 font-mono text-xs font-semibold text-muted-foreground">
              Overview
            </h3>
            <p className="text-sm">{task.overview}</p>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <h3 className="mb-1 font-mono text-xs font-semibold text-muted-foreground">
                Bender
              </h3>
              <p className="font-mono text-sm">{task.bender}</p>
            </div>
            <div>
              <h3 className="mb-1 font-mono text-xs font-semibold text-muted-foreground">
                Branch
              </h3>
              <p className="font-mono text-sm">{task.branch}</p>
            </div>
            <div>
              <h3 className="mb-1 font-mono text-xs font-semibold text-muted-foreground">
                Created
              </h3>
              <p className="font-mono text-sm">{formatDate(task.created)}</p>
            </div>
          </div>

          {/* File Path */}
          <div>
            <h3 className="mb-1 font-mono text-xs font-semibold text-muted-foreground">
              File Path
            </h3>
            <p className="font-mono text-xs text-muted-foreground">
              {task.filePath}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Requirements */}
      {task.requirements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-sm">Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm">
              {task.requirements.map((req, i) => (
                <li key={i}>{req}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Acceptance Criteria */}
      {task.acceptanceCriteria.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-sm">
              Acceptance Criteria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm">
              {task.acceptanceCriteria.map((criteria, i) => (
                <li key={i}>{criteria}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Review */}
      {task.review && (
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-sm">Review</CardTitle>
          </CardHeader>
          <CardContent>
            <ReviewDecision review={task.review} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
