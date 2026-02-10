// Interface contracts for the Workflows module

import type { ArchitectureTier } from './architecture'

export interface Workflow {
  name: string
  title: string
  workflowType: 'goal' | 'explicit' | 'goal-oriented'
  trigger: string
  skill: string | null
  status: 'active' | 'deprecated'
  created: string
  purpose: string
  filePath: string
  sections: WorkflowSection[]
  prerequisites: string[]
  layer: ArchitectureTier | null
  chainNext: string | null
  chainNextTitle: string | null
  chainPrev: string | null
  chainPrevTitle: string | null
}

export interface WorkflowSection {
  heading: string
  level: number
  content: string
}
