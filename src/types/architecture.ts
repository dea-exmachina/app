/**
 * Architecture Visualization System Types
 *
 * Defines the data structures for the tiered architecture map,
 * including nodes, connections, secrets, and annotations.
 */

// ── Tier Types ─────────────────────────────────────────────

export type ArchitectureTier = 'meta' | 'project' | 'infrastructure'

// ── Node Types ─────────────────────────────────────────────

export type NodeCategory =
  | 'kerrigan' // HIVE, QUEEN, CREEP, SWARM
  | 'skill' // Skills registry
  | 'workflow' // Workflows
  | 'project' // Projects
  | 'kanban' // Kanban boards
  | 'bender_team' // Bender teams
  | 'database' // Supabase/PostgreSQL
  | 'hosting' // Vercel
  | 'storage' // R2, GitHub
  | 'oauth' // Google OAuth
  | 'api' // API routes
  | 'runtime' // GCP VM

export type NodeStatus = 'live' | 'building' | 'pending'

export interface WorkflowStep {
  order: number
  name: string
  description: string
  type: 'webhook' | 'transform' | 'store' | 'sync' | 'emit' | 'api' | 'query'
}

export interface SecretReference {
  variableName: string
  secretType: SecretType
  location: SecretLocation
  required: boolean
}

export interface ArchitectureNode {
  id: string
  label: string
  tier: ArchitectureTier
  category: NodeCategory
  status: NodeStatus
  description: string

  // Meta brief - primary function explanation
  brief: string

  // Drill-down data
  tables?: string[] // Database tables this node owns
  secrets?: SecretReference[] // Required env vars
  workflows?: WorkflowStep[] // Internal workflow steps

  // Related work tracking
  cardTags?: string[] // Kanban tags to query (e.g., '#kerrigan', '#queen')

  // Hierarchy
  parentId?: string
  children?: string[]

  // Visual
  position: { x: number; y: number }
  phase: number[]

  // Metadata
  cards?: string[] // Specific card IDs (DEA-xxx)
  metadata?: Record<string, unknown>
}

// ── Connection/Edge Types ──────────────────────────────────

export type DataFlowType =
  | 'event'
  | 'file'
  | 'api'
  | 'webhook'
  | 'realtime'
  | 'sync'

export interface ArchitectureConnection {
  id: string
  source: string
  target: string
  dataType: DataFlowType
  label?: string
  animated?: boolean
  bidirectional?: boolean
}

// ── Secrets Registry Types ─────────────────────────────────

export type SecretType =
  | 'API_KEY'
  | 'TOKEN'
  | 'URL'
  | 'UID_PW'
  | 'SECRET'
  | 'OTHER'
export type SecretLocation = 'vault' | 'webapp' | 'both'

export interface ArchitectureSecret {
  id: string
  componentId: string
  componentType: 'infrastructure' | 'meta' | 'project'
  variableName: string
  secretType: SecretType
  description: string | null
  required: boolean
  location: SecretLocation
  status: 'active' | 'deprecated' | 'planned'
}

// ── Annotation Types ───────────────────────────────────────

export type AnnotationType =
  | 'note'
  | 'suggestion'
  | 'task'
  | 'todo'
  | 'warning'
export type AnnotationPriority = 'low' | 'normal' | 'high' | 'critical'
export type AnnotationTarget =
  | 'node'
  | 'variable'
  | 'connection'
  | 'workflow'
  | 'table'

export interface ArchitectureAnnotation {
  id: string
  targetType: AnnotationTarget
  targetId: string
  targetTier?: ArchitectureTier
  annotationType: AnnotationType
  content: string
  author: string
  priority: AnnotationPriority
  resolved: boolean
  resolvedBy: string | null
  resolvedAt: string | null
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface AnnotationCreate {
  targetType: AnnotationTarget
  targetId: string
  targetTier?: ArchitectureTier
  annotationType: AnnotationType
  content: string
  author: string
  priority?: AnnotationPriority
  metadata?: Record<string, unknown>
}

// ── Table Metadata Types ───────────────────────────────────

export interface TableMetadata {
  name: string
  tier: ArchitectureTier
  owner: string // Which node owns this table
  keyColumns: string[] // Primary columns to display
  description: string
  rowCount?: number // Optional live count
  realtime: boolean // Whether it's in supabase_realtime
}

// ── Work Item Types ────────────────────────────────────────

export interface WorkItem {
  cardId: string
  title: string
  lane: string
  status: 'open' | 'completed'
  completedAt?: string
  tags: string[]
}

// ── View State Types ───────────────────────────────────────

export interface ArchitectureViewState {
  currentTier: ArchitectureTier | null
  expandedNodes: string[]
  selectedNode: string | null
  selectedConnection: string | null
  drillDownLevel: 0 | 1 | 2 | 3 // 0=tier, 1=module, 2=tables, 3=details
  filters: {
    tier: ArchitectureTier | null
    phase: number | null
    status: NodeStatus[]
    showDataFlows: boolean
    showAnnotations: boolean
  }
}

// ── Color Configuration ────────────────────────────────────

export const TIER_COLORS = {
  meta: {
    border: 'border-purple-500',
    bg: 'bg-purple-500/10',
    dot: 'bg-purple-400',
    text: 'text-purple-400',
    accent: 'rgb(168, 85, 247)', // purple-500
  },
  project: {
    border: 'border-blue-500',
    bg: 'bg-blue-500/10',
    dot: 'bg-blue-400',
    text: 'text-blue-400',
    accent: 'rgb(59, 130, 246)', // blue-500
  },
  infrastructure: {
    border: 'border-emerald-500',
    bg: 'bg-emerald-500/10',
    dot: 'bg-emerald-400',
    text: 'text-emerald-400',
    accent: 'rgb(16, 185, 129)', // emerald-500
  },
} as const

export const STATUS_COLORS = {
  live: {
    border: 'border-emerald-500',
    bg: 'bg-emerald-500/10',
    dot: 'bg-emerald-400',
    text: 'text-emerald-400',
  },
  building: {
    border: 'border-amber-500',
    bg: 'bg-amber-500/10',
    dot: 'bg-amber-400',
    text: 'text-amber-400',
  },
  pending: {
    border: 'border-zinc-500',
    bg: 'bg-zinc-500/10',
    dot: 'bg-zinc-400',
    text: 'text-zinc-400',
  },
} as const

export const DATA_FLOW_COLORS = {
  event: {
    stroke: 'stroke-amber-400',
    hex: 'rgb(251, 191, 36)',
  },
  file: {
    stroke: 'stroke-cyan-400',
    hex: 'rgb(34, 211, 238)',
  },
  api: {
    stroke: 'stroke-blue-400',
    hex: 'rgb(96, 165, 250)',
  },
  webhook: {
    stroke: 'stroke-pink-400',
    hex: 'rgb(244, 114, 182)',
  },
  realtime: {
    stroke: 'stroke-emerald-400',
    hex: 'rgb(52, 211, 153)',
  },
  sync: {
    stroke: 'stroke-purple-400',
    hex: 'rgb(192, 132, 252)',
  },
} as const

// ── Phase Definitions ──────────────────────────────────────

export const ARCHITECTURE_PHASES = [
  { id: null, label: 'All', description: 'Show all nodes' },
  { id: 0, label: 'Architecture', description: 'System design phase' },
  { id: 1, label: 'Core Infra', description: 'HIVE, CREEP, database' },
  { id: 2, label: 'Integration', description: 'QUEEN, API routes' },
  { id: 3, label: 'Standards', description: 'CREEP standards library' },
  { id: 4, label: 'Swarm', description: 'Emergent coordination' },
] as const

// ── Tier Definitions ───────────────────────────────────────

export const ARCHITECTURE_TIERS = [
  { id: null, label: 'All', description: 'Show all tiers' },
  { id: 'meta', label: 'META', description: 'System-wide orchestration' },
  { id: 'project', label: 'PROJECT', description: 'Project-level entities' },
  {
    id: 'infrastructure',
    label: 'INFRA',
    description: 'External services & hosting',
  },
] as const
