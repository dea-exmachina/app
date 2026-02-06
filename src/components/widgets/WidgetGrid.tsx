'use client'

import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout'
import { useLayout } from '@/contexts/LayoutContext'
import { useLayoutPersistence } from '@/hooks/useLayoutPersistence'
import { WidgetPanel } from './WidgetPanel'
import type { PageLayoutConfig } from '@/types/widget'

interface WidgetGridProps {
  pageId: string
  config: PageLayoutConfig
}

export function WidgetGrid({ pageId, config }: WidgetGridProps) {
  const { editMode } = useLayout()
  const { layouts, onLayoutChange } = useLayoutPersistence(
    pageId,
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
          rowHeight={80}
          width={width}
          dragConfig={{
            enabled: editMode,
            handle: '.widget-drag-handle',
          }}
          resizeConfig={{
            enabled: editMode,
          }}
          onLayoutChange={onLayoutChange}
          containerPadding={[0, 0]}
          margin={[12, 12]}
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
