'use client'

import { Header } from '@/components/layout/Header'
import { MissionBriefing } from '@/components/dashboard/MissionBriefing'
import { QuickStats } from '@/components/dashboard/QuickStats'
import { BoardSummaryCard } from '@/components/dashboard/BoardSummaryCard'
import { BenderStatusWidget } from '@/components/dashboard/BenderStatusWidget'
import { useDashboard } from '@/hooks/useDashboard'

export default function DashboardPage() {
  const { data, loading, error } = useDashboard()

  if (loading) {
    return (
      <div className="space-y-6">
        <Header title="Dashboard" description="dea-exmachina control center" />
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Header title="Dashboard" description="dea-exmachina control center" />
        <div className="text-sm text-destructive">
          Failed to load dashboard: {error || 'Unknown error'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Header title="Dashboard" description="dea-exmachina control center" />

      {/* Quick Stats */}
      <QuickStats
        boardCount={data.boardStats.length}
        skillCount={data.skillCount}
        workflowCount={data.workflowCount}
        benderCount={data.activeBenders.length}
      />

      {/* Mission Briefing */}
      <MissionBriefing handoff={data.handoff} />

      {/* Board Summaries */}
      <div>
        <h2 className="mb-4 font-mono text-sm font-semibold text-muted-foreground">
          Kanban Boards
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.boardStats.map((board) => (
            <BoardSummaryCard key={board.id} board={board} />
          ))}
        </div>
      </div>

      {/* Bender Status */}
      {data.activeBenders.length > 0 && (
        <BenderStatusWidget benders={data.activeBenders} />
      )}
    </div>
  )
}
