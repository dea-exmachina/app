'use client'

import { Suspense } from 'react'
import { UnifiedBoardView } from '@/components/kanban/UnifiedBoardView'

export default function UnifiedBoardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Unified Board</h1>
        <p className="text-sm text-muted-foreground">
          All cards across all projects in one view
        </p>
      </div>
      <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
        <UnifiedBoardView />
      </Suspense>
    </div>
  )
}
