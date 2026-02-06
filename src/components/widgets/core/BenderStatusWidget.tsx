/**
 * Bender Status Widget
 *
 * Shows active benders, task queue, platform health.
 * Universal widget (works for all project types).
 */

'use client'

import { WidgetProps } from '@/lib/widgets/registry'

export function BenderStatusWidget({
  projectId,
  config,
  editMode,
}: WidgetProps) {
  // TODO: Implement bender status display
  // - Fetch project_benders from /api/benders?project_id={projectId}
  // - Fetch bender_tasks from /api/bender-tasks?project_id={projectId}&status=executing
  // - Show platform health (online/offline)
  // - Real-time updates via Supabase Realtime

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Bender Status</h3>
        {editMode && (
          <span className="text-xs text-muted-foreground">Edit Mode</span>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-auto">
        {/* Placeholder benders */}
        {[
          { role: 'Frontend', status: 'idle', platform: 'Claude' },
          { role: 'Backend', status: 'executing', platform: 'Claude' },
          { role: 'Reviewer', status: 'idle', platform: 'Claude' },
        ].map((bender) => (
          <div
            key={bender.role}
            className="flex items-center justify-between rounded border border-border bg-muted/30 p-3"
          >
            <div>
              <div className="font-medium text-sm">{bender.role}</div>
              <div className="text-xs text-muted-foreground">
                {bender.platform}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  bender.status === 'executing'
                    ? 'bg-green-500'
                    : 'bg-gray-400'
                }`}
              />
              <span className="text-xs capitalize">{bender.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        Connected to project: {projectId}
      </div>
    </div>
  )
}
