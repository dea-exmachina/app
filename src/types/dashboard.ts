// Interface contracts for the Dashboard module

import type { HandoffSection, BoardSummary } from './kanban'

export interface DashboardSummary {
  handoff: HandoffSection | null
  boardStats: BoardSummary[]
  activeBenders: Array<{
    platform: string
    status: string
    activeTasks: number
  }>
  skillCount: number
  workflowCount: number
}
