/**
 * Dashboard Page (Demo)
 *
 * Demonstrates the widget system with a sample project.
 * This will be replaced with dynamic project-specific dashboards.
 */

'use client'

import { useState } from 'react'
import { DashboardGrid } from '@/components/dashboard/DashboardGrid'
import type { DashboardLayout } from '@/types/project'

// Import to register core widgets
import '@/lib/widgets/core-widgets'

export default function DashboardPage() {
  const [editMode, setEditMode] = useState(false)

  // Demo layout with 3 core widgets
  const [layout, setLayout] = useState<DashboardLayout>({
    columns: 4,
    theme: 'dark',
    widgets: [
      {
        type: 'kanban',
        position: { row: 0, col: 0, width: 3, height: 2 },
        config: {},
        visible: true,
      },
      {
        type: 'bender-status',
        position: { row: 0, col: 3, width: 1, height: 1 },
        config: {},
        visible: true,
      },
      {
        type: 'chat',
        position: { row: 1, col: 3, width: 1, height: 1 },
        config: {},
        visible: true,
      },
    ],
  })

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Demo</h1>
            <p className="text-muted-foreground text-sm">
              Widget System Preview
            </p>
          </div>
          <button
            onClick={() => setEditMode(!editMode)}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            {editMode ? 'Exit Edit Mode' : 'Edit Dashboard'}
          </button>
        </div>
      </header>

      <main className="flex-1 p-6">
        <DashboardGrid
          projectId="demo-project-123"
          layout={layout}
          onLayoutChange={setLayout}
          editMode={editMode}
        />
      </main>

      {editMode && (
        <footer className="border-t border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Edit Mode Active — Changes are not saved yet
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setEditMode(false)}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Save layout to database
                  console.log('Saving layout:', layout)
                  setEditMode(false)
                }}
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                Save Changes
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}
