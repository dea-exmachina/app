'use client'

import { useState } from 'react'
import { GripVertical, ChevronDown, ChevronUp } from 'lucide-react'
import { useLayout } from '@/contexts/LayoutContext'

interface WidgetPanelProps {
  title: string
  children: React.ReactNode
}

export function WidgetPanel({ title, children }: WidgetPanelProps) {
  const { editMode } = useLayout()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="h-full flex flex-col border border-border/50 bg-card rounded-md overflow-hidden widget-panel-focus">
      {/* Title Bar */}
      <div className="bg-muted/30 border-b border-border/50 px-3 py-1.5 flex items-center gap-2 shrink-0">
        {editMode && (
          <GripVertical className="h-4 w-4 text-muted-foreground widget-drag-handle cursor-move" />
        )}
        <span className="flex-1 font-mono text-xs font-semibold text-foreground">
          {title}
        </span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Content Area */}
      {!collapsed && (
        <div className="p-3 overflow-auto flex-1">{children}</div>
      )}
    </div>
  )
}
