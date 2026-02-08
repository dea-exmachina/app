'use client'

import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout'
import { useLayout } from '@/contexts/LayoutContext'
import { useLayoutPersistence } from '@/hooks/useLayoutPersistence'
import { WidgetPanel } from './WidgetPanel'
import type { PageLayoutConfig } from '@/types/widget'

interface WidgetGridProps {
  pageId?: string
  config: PageLayoutConfig
  editMode?: boolean
  rowHeight?: number
  margin?: [number, number]
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
  const { layouts, onLayoutChange } = useLayoutPersistence(
    resolvedPageId,
    config.defaultLayouts
  )
  const { width, mounted, containerRef } = useContainerWidth({
    measureBeforeMount: true,
  })

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {/* Compact edit toggle — only shown when page doesn't provide its own */}
      {!hasExternalEditMode && (
        <div className="flex items-center justify-end gap-2 px-1 py-1 mb-1">
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
            <button
              onClick={() => layoutCtx.resetLayout(resolvedPageId)}
              className="font-mono text-[10px] px-2 py-0.5 rounded-sm border border-terminal-border text-terminal-fg-tertiary hover:text-terminal-fg-secondary transition-colors"
            >
              RESET
            </button>
          )}
        </div>
      )}

      {mounted && width > 0 && (
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
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
          {config.widgets.map((widget) => (
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
