'use client'

import { useState } from 'react'
import { DashboardWidgetProvider } from '@/components/widgets/dashboard/DashboardWidgetProvider'
import { dashboardConfig } from '@/config/layouts/dashboard'
import { WidgetGrid } from '@/components/widgets/WidgetGrid'

export default function DashboardPage() {
  const [editMode, setEditMode] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-terminal-bg-base">
      {/* Compact header */}
      <header className="flex items-center justify-between border-b border-terminal-border bg-terminal-bg-surface px-4 py-2">
        <span className="terminal-section border-b-0 pb-0">Dashboard</span>
        <button
          onClick={() => setEditMode(!editMode)}
          className="font-mono text-[10px] px-2 py-1 rounded-sm border border-terminal-border text-terminal-fg-secondary hover:bg-terminal-bg-elevated hover:text-terminal-fg-primary transition-colors"
        >
          {editMode ? 'DONE' : 'EDIT'}
        </button>
      </header>

      {/* Widget grid */}
      <main className="flex-1 p-2">
        <DashboardWidgetProvider>
          <WidgetGrid
            config={dashboardConfig}
            editMode={editMode}
            rowHeight={60}
            margin={[8, 8]}
          />
        </DashboardWidgetProvider>
      </main>
    </div>
  )
}
