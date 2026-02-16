// Interface contracts for the Kanban module
// Frontend and Backend benders code against these types

export interface KanbanCard {
  id: string
  title: string
  completed: boolean
  tags: string[]
  description: string | null
  metadata: Record<string, string>
  rawMarkdown: string
  startedAt?: string | null
  completedAt?: string | null
  readyForProduction?: boolean
}

export type SortField = 'startedAt' | 'completedAt'
export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  field: SortField
  direction: SortDirection
}

export interface KanbanLane {
  name: string
  cards: KanbanCard[]
}

export interface KanbanBoard {
  id: string
  name: string
  filePath: string
  handoff: HandoffSection | null
  lanes: KanbanLane[]
}

export interface HandoffSection {
  updated: string
  context: string
  nextItems: string[]
  whereWeLeftOff: {
    project: string
    state: string
    location: string
  }
  blockers: string[]
  benderStatus: Array<{
    taskId: string
    description: string
    status: string
  }>
}

export interface BoardSummary {
  id: string
  name: string
  filePath: string
  laneStats: Array<{ name: string; total: number; completed: number }>
  totalOpen: number
  totalCompleted: number
}
