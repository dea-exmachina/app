/**
 * Kanban Board Widget
 *
 * Displays project kanban board with lanes and cards.
 * Universal widget (works for all project types).
 */

'use client'

import { WidgetProps } from '@/lib/widgets/registry'

export function KanbanWidget({ projectId, config, editMode }: WidgetProps) {
  // TODO: Implement kanban board display
  // - Fetch kanban cards from /api/kanban-cards?project_id={projectId}
  // - Group by lane
  // - Drag-drop between lanes
  // - Real-time updates via Supabase Realtime

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Kanban Board</h3>
        {editMode && (
          <span className="text-xs text-muted-foreground">Edit Mode</span>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex gap-4">
          {/* Placeholder lanes */}
          {['Inbox', 'Ready', 'In Progress', 'Review', 'Done'].map((lane) => (
            <div
              key={lane}
              className="flex min-w-[250px] flex-col rounded-md border border-border bg-muted/30 p-3"
            >
              <div className="mb-2 font-medium text-sm">{lane}</div>
              <div className="flex-1 space-y-2">
                {/* Card placeholder */}
                <div className="rounded border border-border bg-card p-2 text-sm">
                  <div className="font-medium">Sample Card</div>
                  <div className="text-xs text-muted-foreground">
                    #{projectId.slice(0, 8)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        Connected to project: {projectId}
      </div>
    </div>
  )
}
