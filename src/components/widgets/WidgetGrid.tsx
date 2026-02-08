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
              <WidgetPanel title={widget.title}>
                <widget.component />
              </WidgetPanel>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  )
}
