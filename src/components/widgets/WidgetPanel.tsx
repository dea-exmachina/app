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
    <div className="h-full flex flex-col border border-terminal-border bg-terminal-bg-surface rounded-sm overflow-hidden widget-panel-focus">
      {/* Title Bar */}
      <div className="bg-terminal-bg-elevated/50 border-b border-terminal-border px-2 py-1 flex items-center gap-1.5 shrink-0">
        {editMode && (
          <GripVertical className="h-3 w-3 text-terminal-fg-tertiary widget-drag-handle cursor-move" />
        )}
        <span className="flex-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-terminal-fg-secondary">
          {title}
        </span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-terminal-fg-tertiary hover:text-terminal-fg-primary transition-colors"
          aria-label={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronUp className="h-3 w-3" />
          )}
        </button>
      </div>

      {/* Content Area */}
      {!collapsed && (
        <div className="p-2 overflow-auto flex-1">{children}</div>
      )}
    </div>
  )
}
