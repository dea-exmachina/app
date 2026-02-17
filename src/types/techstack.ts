/**
 * Tech Stack & Workflows Types
 *
 * Backed by project_tech_stack and project_workflows Supabase tables.
 */

// ── Tech Stack ─────────────────────────────────────

export interface TechStackItem {
  id: string
  projectId: string
  name: string
  version: string | null
  category: TechCategory
  role: string | null
  url: string | null
  notes: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type TechCategory =
  | 'framework'
  | 'language'
  | 'database'
  | 'hosting'
  | 'library'
  | 'tool'
  | 'service'
  | 'other'

export interface TechStackCreateRequest {
  name: string
  version?: string
  category: TechCategory
  role?: string
  url?: string
  notes?: string
  metadata?: Record<string, unknown>
}

export interface TechStackUpdateRequest {
  name?: string
  version?: string
  category?: TechCategory
  role?: string
  url?: string
  notes?: string
  metadata?: Record<string, unknown>
}

// ── Workflows ──────────────────────────────────────

export interface ProjectWorkflow {
  id: string
  projectId: string
  name: string
  description: string | null
  workflowPath: string | null
  triggerEvent: string | null
  automated: boolean
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface WorkflowCreateRequest {
  name: string
  description?: string
  workflowPath?: string
  triggerEvent?: string
  automated?: boolean
  metadata?: Record<string, unknown>
}

export interface WorkflowUpdateRequest {
  name?: string
  description?: string
  workflowPath?: string
  triggerEvent?: string
  automated?: boolean
  metadata?: Record<string, unknown>
}
