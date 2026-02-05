// Interface contracts for the Workflows module

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
}

export interface WorkflowSection {
  heading: string
  level: number
  content: string
}
