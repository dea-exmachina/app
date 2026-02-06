// Interface contracts for the Bender module

export interface BenderPlatform {
  name: string
  slug: string
  status: 'active' | 'planned' | 'archived'
  interface: string
  models: string[]
  costTier: 'cheap' | 'expensive' | 'TBD'
  strengths: string[]
  limitations: string[]
  configLocation: string
  contextDirectory: string
}

export interface BenderTask {
  taskId: string
  title: string
  created: string
  bender: string
  status: 'proposed' | 'executing' | 'delivered' | 'integrated'
  priority: 'focus' | 'normal'
  branch: string
  overview: string
  requirements: string[]
  acceptanceCriteria: string[]
  review: {
    decision: 'ACCEPT' | 'PARTIAL' | 'REJECT'
    feedback: string
  } | null
  filePath: string
}

export interface BenderAgent {
  name: string
  role: string
  platform: string
  invocation: string
  team: string | null
}

export interface BenderTaskCreateRequest {
  title: string
  overview: string
  context?: string
  requirements: string[]
  acceptanceCriteria: string[]
  references?: string[]
  constraints?: string[]
  priority?: 'focus' | 'normal'
  branch?: string
}

export interface BenderTeam {
  name: string
  members: BenderAgent[]
  sequencing: string
  fileOwnership: Record<string, { owns: string[]; mustNotTouch: string[] }>
  branchStrategy: string
}
