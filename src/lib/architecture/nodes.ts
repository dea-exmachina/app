import type { Node, Edge } from 'reactflow'

export type NodeStatus = 'live' | 'building' | 'pending'

export interface SystemNodeData {
  label: string
  status: NodeStatus
  description: string
  phase: number[]
  cards?: string[] // Related kanban cards (DEA-xxx)
}

export interface InfraNodeData {
  label: string
  status: NodeStatus
  description: string
  phase: number[]
}

// KERRIGAN System Nodes
export const KERRIGAN_NODES: Node<SystemNodeData | InfraNodeData>[] = [
  // Layer 1: Core Systems
  {
    id: 'hive',
    type: 'system',
    position: { x: 100, y: 50 },
    data: {
      label: 'HIVE',
      status: 'live',
      description: 'Team Construction Factory',
      phase: [0, 1],
      cards: ['DEA-031'],
    },
  },
  {
    id: 'queen',
    type: 'system',
    position: { x: 400, y: 50 },
    data: {
      label: 'QUEEN',
      status: 'building',
      description: 'External Orchestration',
      phase: [0, 2],
      cards: ['DEA-032', 'DEA-040'],
    },
  },
  {
    id: 'creep',
    type: 'system',
    position: { x: 100, y: 200 },
    data: {
      label: 'CREEP',
      status: 'live',
      description: 'Context & Knowledge',
      phase: [0, 1, 3],
      cards: ['DEA-034'],
    },
  },
  {
    id: 'swarm',
    type: 'system',
    position: { x: 400, y: 200 },
    data: {
      label: 'THE SWARM',
      status: 'pending',
      description: 'Emergent Coordination',
      phase: [0, 4],
      cards: ['DEA-035'],
    },
  },

  // Layer 2: Control Center Infrastructure
  {
    id: 'supabase',
    type: 'infra',
    position: { x: 250, y: 350 },
    data: {
      label: 'Supabase',
      status: 'live',
      description: 'PostgreSQL + Realtime',
      phase: [1, 2],
    },
  },
  {
    id: 'api',
    type: 'infra',
    position: { x: 250, y: 450 },
    data: {
      label: 'API Routes',
      status: 'live',
      description: 'Next.js App Router',
      phase: [1, 2],
    },
  },
  {
    id: 'ui',
    type: 'infra',
    position: { x: 250, y: 550 },
    data: {
      label: 'UI Layer',
      status: 'building',
      description: 'Dashboard Components',
      phase: [2],
    },
  },
]

// KERRIGAN Data Flow Edges
export const KERRIGAN_EDGES: Edge[] = [
  // Core system connections
  { id: 'hive-queen', source: 'hive', target: 'queen', animated: true, label: 'teams build' },
  { id: 'queen-creep', source: 'queen', target: 'creep', label: 'feeds context' },
  { id: 'creep-swarm', source: 'creep', target: 'swarm', label: 'enables' },
  { id: 'swarm-hive', source: 'swarm', target: 'hive', animated: true, label: 'triggers' },

  // Core to infrastructure
  { id: 'hive-db', source: 'hive', target: 'supabase', style: { strokeDasharray: '5,5' } },
  { id: 'queen-db', source: 'queen', target: 'supabase', style: { strokeDasharray: '5,5' } },

  // Infrastructure stack
  { id: 'db-api', source: 'supabase', target: 'api' },
  { id: 'api-ui', source: 'api', target: 'ui' },
]

// Phase definitions for the selector
export const PHASES = [
  { id: null, label: 'All', description: 'Show all nodes' },
  { id: 0, label: 'Architecture', description: 'System design phase' },
  { id: 1, label: 'Core Infra', description: 'HIVE, CREEP, database' },
  { id: 2, label: 'Integration', description: 'QUEEN, API routes' },
  { id: 3, label: 'Standards', description: 'CREEP standards library' },
  { id: 4, label: 'Swarm', description: 'Emergent coordination' },
] as const

// Get nodes for a specific phase
export function getNodesForPhase(phase: number | null): string[] {
  if (phase === null) return KERRIGAN_NODES.map((n) => n.id)
  return KERRIGAN_NODES.filter((n) => n.data.phase.includes(phase)).map((n) => n.id)
}

// Status color mapping
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
