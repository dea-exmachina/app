'use client'

import type { WidgetDefinition } from '@/types/widget'

interface WidgetCatalogProps {
  widgets: WidgetDefinition[]
  visibleIds: Set<string>
  onToggle: (widgetId: string) => void
  onClose: () => void
}

export function WidgetCatalog({ widgets, visibleIds, onToggle, onClose }: WidgetCatalogProps) {
  return (
    <div className="absolute right-0 top-8 z-50 w-56 rounded-sm border border-terminal-border bg-terminal-bg-surface shadow-lg">
      <div className="flex items-center justify-between border-b border-terminal-border px-3 py-1.5">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-terminal-fg-secondary">
          Widgets
        </span>
        <button
          onClick={onClose}
          className="font-mono text-[10px] text-terminal-fg-tertiary hover:text-terminal-fg-primary transition-colors"
        >
          x
        </button>
      </div>
      <div className="p-1.5 space-y-px">
        {widgets.map((w) => {
          const isVisible = visibleIds.has(w.id)
          return (
            <button
              key={w.id}
              onClick={() => onToggle(w.id)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 font-mono text-[11px] transition-colors hover:bg-terminal-bg-elevated"
            >
              <span
                className={`inline-block h-2.5 w-2.5 rounded-sm border ${
                  isVisible
                    ? 'border-user-accent bg-user-accent'
                    : 'border-terminal-border-strong bg-transparent'
                }`}
              />
              <span
                className={
                  isVisible ? 'text-terminal-fg-primary' : 'text-terminal-fg-tertiary'
                }
              >
                {w.title}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
