import type { BenderTask } from '@/types/bender'
import { StatusDot, statusToType } from '@/components/ui/status-dot'
import { SectionDivider } from '@/components/ui/section-divider'
import { ReviewDecision } from './ReviewDecision'
import { formatDate } from '@/lib/client/formatters'

interface TaskDetailProps {
  task: BenderTask
}

export function TaskDetail({ task }: TaskDetailProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b border-terminal-border pb-3">
        <div className="flex items-center gap-3 mb-1">
          <span className="font-mono text-[11px] font-semibold text-user-accent">
            {task.taskId}
          </span>
          <StatusDot
            status={statusToType(task.status)}
            label={task.status}
            size={5}
          />
          {task.priority === 'focus' && (
            <span className="font-mono text-[10px] text-status-warn uppercase tracking-wider">
              focus
            </span>
          )}
        </div>
        <h2 className="font-mono text-sm font-semibold text-terminal-fg-primary">
          {task.title}
        </h2>
      </div>

      {/* Key-value metadata */}
      <div className="grid grid-cols-3 gap-x-4 gap-y-1 font-mono text-[11px]">
        <div>
          <span className="text-terminal-fg-tertiary uppercase tracking-wider">Bender </span>
          <span className="text-terminal-fg-primary">{task.bender}</span>
        </div>
        <div>
          <span className="text-terminal-fg-tertiary uppercase tracking-wider">Branch </span>
          <span className="text-terminal-fg-secondary">{task.branch}</span>
        </div>
        <div>
          <span className="text-terminal-fg-tertiary uppercase tracking-wider">Created </span>
          <span className="text-terminal-fg-secondary">{formatDate(task.created)}</span>
        </div>
      </div>

      {/* Overview */}
      <div>
        <SectionDivider label="Overview" />
        <p className="mt-1.5 text-[13px] text-terminal-fg-primary leading-relaxed">
          {task.overview}
        </p>
      </div>

      {/* Requirements */}
      {task.requirements.length > 0 && (
        <div>
          <SectionDivider label="Requirements" />
          <ul className="mt-1.5 space-y-0.5 font-mono text-[11px] text-terminal-fg-secondary">
            {task.requirements.map((req, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-terminal-fg-tertiary shrink-0">{i + 1}.</span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Acceptance Criteria */}
      {task.acceptanceCriteria.length > 0 && (
        <div>
          <SectionDivider label="Acceptance Criteria" />
          <ul className="mt-1.5 space-y-0.5 font-mono text-[11px] text-terminal-fg-secondary">
            {task.acceptanceCriteria.map((criteria, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-terminal-fg-tertiary shrink-0">-</span>
                <span>{criteria}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Review */}
      {task.review && (
        <div>
          <SectionDivider label="Review" />
          <div className="mt-1.5">
            <ReviewDecision review={task.review} />
          </div>
        </div>
      )}

      {/* File path */}
      <div className="pt-2 border-t border-terminal-border">
        <span className="font-mono text-[10px] text-terminal-fg-tertiary">
          {task.filePath}
        </span>
      </div>
    </div>
  )
}
