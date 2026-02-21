// Interface contracts for the Skills module

import type { Workflow } from './workflow'

export type SkillCategory =
  | 'meta'
  | 'identity'
  | 'bender-management'
  | 'session'
  | 'content'
  | 'development'
  | 'professional'

export interface Skill {
  name: string
  description: string
  category: SkillCategory
  workflow: string | null
  status: 'active' | 'deprecated' | 'planned'
  updated_at?: string
}

export interface SkillDetail extends Skill {
  linkedWorkflow: Workflow | null
}
