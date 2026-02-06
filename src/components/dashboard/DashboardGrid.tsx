/**
 * Dashboard Grid
 *
 * Composable grid layout for dashboard widgets.
 * Supports drag-drop, resize, and persistence.
 *
 * Meta-framework compliance:
 * - Extensible: Add new widgets via registry
 * - Modular: Each widget is independent
 * - Dynamic: Layout configured at runtime (JSONB in DB)
 */

'use client'

import { useState } from 'react'
import type { DashboardLayout, Widget } from '@/types/project'
import { getWidget } from '@/lib/widgets/registry'

interface DashboardGridProps {
  projectId: string
  layout: DashboardLayout
  onLayoutChange?: (layout: DashboardLayout) => void
  editMode?: boolean
}

export function DashboardGrid({
  projectId,
  layout,
  onLayoutChange,
  editMode = false,
}: DashboardGridProps) {
  const [localLayout, setLocalLayout] = useState<DashboardLayout>(layout)

  const handleConfigChange = (
    widgetIndex: number,
    newConfig: Record<string, any>
  ) => {
    const updatedWidgets = [...localLayout.widgets]
    updatedWidgets[widgetIndex] = {
      ...updatedWidgets[widgetIndex],
      config: newConfig,
    }

    const newLayout: DashboardLayout = {
      ...localLayout,
      widgets: updatedWidgets,
    }

    setLocalLayout(newLayout)
    onLayoutChange?.(newLayout)
  }

  return (
    <div
      className={`grid gap-4 ${
        localLayout.columns === 4
          ? 'grid-cols-4'
          : localLayout.columns === 3
            ? 'grid-cols-3'
            : localLayout.columns === 2
              ? 'grid-cols-2'
              : 'grid-cols-1'
      }`}
    >
      {localLayout.widgets
        .filter((widget) => widget.visible)
        .map((widget, index) => {
          const definition = getWidget(widget.type)
          if (!definition) {
            return (
              <div
                key={index}
                className="rounded-lg border border-destructive bg-destructive/10 p-4"
              >
                <p className="text-destructive text-sm">
                  Unknown widget type: {widget.type}
                </p>
              </div>
            )
          }

          const WidgetComponent = definition.component

          return (
            <div
              key={index}
              style={{
                gridColumn: `span ${widget.position.width}`,
                gridRow: `span ${widget.position.height}`,
              }}
              className="min-h-[200px]"
            >
              <WidgetComponent
                projectId={projectId}
                config={widget.config}
                onConfigChange={(newConfig) =>
                  handleConfigChange(index, newConfig)
                }
                editMode={editMode}
              />
            </div>
          )
        })}

      {localLayout.widgets.filter((w) => w.visible).length === 0 && (
        <div className="col-span-full flex min-h-[400px] items-center justify-center rounded-lg border border-dashed border-border">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              No widgets configured
            </p>
            {editMode && (
              <p className="mt-2 text-muted-foreground text-xs">
                Add widgets from the widget library
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
