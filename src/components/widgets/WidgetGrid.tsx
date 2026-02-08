'use client'

import { useState, useMemo } from 'react'
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout'
import { useLayout } from '@/contexts/LayoutContext'
import { useLayoutPersistence } from '@/hooks/useLayoutPersistence'
import { useWidgetVisibility } from '@/hooks/useWidgetVisibility'
import { WidgetPanel } from './WidgetPanel'
import { WidgetCatalog } from './WidgetCatalog'
import type { PageLayoutConfig, Layouts } from '@/types/widget'

interface WidgetGridProps {
  pageId?: string
  config: PageLayoutConfig
  editMode?: boolean
  rowHeight?: number
  margin?: [number, number]
}

/** Filter layouts to only include visible widget IDs */
function filterLayouts(layouts: Layouts, visibleIds: Set<string>): Layouts {
  const filtered: Layouts = {}
  for (const [bp, items] of Object.entries(layouts)) {
    if (items) {
      filtered[bp] = items.filter((item) => visibleIds.has(item.i))
    }
  }
  return filtered
}

export function WidgetGrid({
  pageId,
  config,
  editMode: editModeProp,
  rowHeight = 60,
  margin = [8, 8],
}: WidgetGridProps) {
  const layoutCtx = useLayout()
  const isEditing = editModeProp ?? layoutCtx.editMode
  const hasExternalEditMode = editModeProp !== undefined
  const resolvedPageId = pageId ?? config.pageId

  const allWidgetIds = useMemo(() => config.widgets.map((w) => w.id), [config.widgets])
  const { visibleIds, toggleWidget, loaded: visLoaded } = useWidgetVisibility(
    resolvedPageId,
    allWidgetIds
  )

  const { layouts, onLayoutChange } = useLayoutPersistence(
    resolvedPageId,
    config.defaultLayouts
  )
  const { width, mounted, containerRef } = useContainerWidth({
    measureBeforeMount: true,
  })

  const [catalogOpen, setCatalogOpen] = useState(false)

  // Filter widgets and layouts by visibility
  const visibleWidgets = useMemo(
    () => config.widgets.filter((w) => visibleIds.has(w.id)),
    [config.widgets, visibleIds]
  )
  const filteredLayouts = useMemo(
    () => filterLayouts(layouts, visibleIds),
    [layouts, visibleIds]
  )

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {/* Compact edit toggle — only shown when page doesn't provide its own */}
      {!hasExternalEditMode && (
        <div className="relative flex items-center justify-end gap-2 px-1 py-1 mb-1">
          <button
            onClick={layoutCtx.toggleEditMode}
            className={`font-mono text-[10px] px-2 py-0.5 rounded-sm border transition-colors ${
              isEditing
                ? 'border-user-accent text-user-accent bg-user-accent/10'
                : 'border-terminal-border text-terminal-fg-tertiary hover:text-terminal-fg-secondary'
            }`}
          >
            {isEditing ? 'DONE' : 'EDIT'}
          </button>
          {isEditing && (
            <>
              <button
                onClick={() => layoutCtx.resetLayout(resolvedPageId)}
                className="font-mono text-[10px] px-2 py-0.5 rounded-sm border border-terminal-border text-terminal-fg-tertiary hover:text-terminal-fg-secondary transition-colors"
              >
                RESET
              </button>
              <button
                onClick={() => setCatalogOpen((v) => !v)}
                className={`font-mono text-[10px] px-2 py-0.5 rounded-sm border transition-colors ${
                  catalogOpen
                    ? 'border-user-accent text-user-accent bg-user-accent/10'
                    : 'border-terminal-border text-terminal-fg-tertiary hover:text-terminal-fg-secondary'
                }`}
              >
                + WIDGETS
              </button>
              {catalogOpen && (
                <WidgetCatalog
                  widgets={config.widgets}
                  visibleIds={visibleIds}
                  onToggle={toggleWidget}
                  onClose={() => setCatalogOpen(false)}
                />
              )}
            </>
          )}
        </div>
      )}

      {mounted && width > 0 && visLoaded && (
        <ResponsiveGridLayout
          className="layout"
          layouts={filteredLayouts}
          breakpoints={{ lg: 1200, md: 768, sm: 0 }}
          cols={{ lg: 12, md: 8, sm: 4 }}
          rowHeight={rowHeight}
          width={width}
          dragConfig={{
            enabled: isEditing,
            handle: '.widget-drag-handle',
          }}
          resizeConfig={{
            enabled: isEditing,
          }}
          onLayoutChange={onLayoutChange}
          containerPadding={[0, 0]}
          margin={margin}
        >
          {visibleWidgets.map((widget) => (
            <div key={widget.id}>
              <WidgetPanel title={widget.title} editMode={isEditing}>
                <widget.component />
              </WidgetPanel>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  )
}
