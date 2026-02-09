import type { Node, Edge } from 'reactflow'
import type {
  ArchitectureTier,
  NodeCategory,
  NodeStatus,
  WorkflowStep,
  SecretReference,
  DataFlowType,
} from '@/types/architecture'

// ── Legacy Types (backwards compatibility) ─────────────────

export type { NodeStatus }

export interface SystemNodeData {
  label: string
  status: NodeStatus
  description: string
  phase: number[]
  cards?: string[]
  // Extended fields
  tier?: ArchitectureTier
  category?: NodeCategory
  brief?: string
  tables?: string[]
  secrets?: SecretReference[]
  workflows?: WorkflowStep[]
  cardTags?: string[]
}

export interface InfraNodeData {
  label: string
  status: NodeStatus
  description: string
  phase: number[]
  // Extended fields
  tier?: ArchitectureTier
  category?: NodeCategory
  brief?: string
  tables?: string[]
  secrets?: SecretReference[]
}

// ── Enhanced Node Data ─────────────────────────────────────

export interface EnhancedNodeData {
  label: string
  status: NodeStatus
  description: string
  phase: number[]
  tier: ArchitectureTier
  category: NodeCategory
  brief: string
  cards?: string[]
  cardTags?: string[]
  tables?: string[]
  secrets?: SecretReference[]
  workflows?: WorkflowStep[]
}

// ── META Tier Nodes ────────────────────────────────────────

const META_NODES: Node<EnhancedNodeData>[] = [
  {
    id: 'hive',
    type: 'system',
    position: { x: 100, y: 50 },
    data: {
      label: 'HIVE \u2014 Architect',
      status: 'live',
      description: 'Team Construction',
      tier: 'meta',
      category: 'kerrigan',
      brief:
        'Team construction factory. Assembles bender teams from goal descriptions using the capability registry. Produces team manifests with roles, identities, task breakdown, and context packages.',
      phase: [0, 1],
      cards: ['DEA-031'],
      cardTags: ['#hive', '#swarm'],
      tables: [
        'bender_identities',
        'bender_teams',
        'bender_platforms',
        'project_benders',
      ],
    },
  },
  {
    id: 'creep',
    type: 'system',
    position: { x: 400, y: 50 },
    data: {
      label: 'CREEP \u2014 Zagara',
      status: 'building',
      description: 'External Orchestration',
      tier: 'meta',
      category: 'kerrigan',
      brief:
        'External orchestration engine. Receives webhooks from external platforms (Jira, Linear), transforms them to internal entities, syncs bidirectionally with circuit breakers, and emits events for other systems to consume.',
      phase: [0, 2],
      cards: ['DEA-032', 'DEA-040'],
      cardTags: ['#creep', '#swarm'],
      tables: ['queen_events', 'agent_health', 'webhook_configs', 'sync_state'],
      workflows: [
        {
          order: 1,
          name: 'Webhook Receive',
          type: 'webhook',
          description: 'Accept inbound webhooks from external platforms',
        },
        {
          order: 2,
          name: 'Transform',
          type: 'transform',
          description: 'Convert external payload to internal entity format',
        },
        {
          order: 3,
          name: 'Store Event',
          type: 'store',
          description: 'Persist to queen_events table',
        },
        {
          order: 4,
          name: 'Sync',
          type: 'sync',
          description: 'Push changes to kanban/tasks with circuit breakers',
        },
        {
          order: 5,
          name: 'Emit',
          type: 'emit',
          description: 'Broadcast via Supabase Realtime',
        },
      ],
    },
  },
  {
    id: 'evolution',
    type: 'system',
    position: { x: 100, y: 200 },
    data: {
      label: 'EVOLUTION \u2014 Abathur',
      status: 'live',
      description: 'Quality & Knowledge',
      tier: 'meta',
      category: 'kerrigan',
      brief:
        'Quality and knowledge management system. Maintains the capability registry, builds context packages for bender tasks, extracts learnings from completed work, and enforces standards/compliance.',
      phase: [0, 1, 3],
      cards: ['DEA-034'],
      cardTags: ['#evolution', '#swarm'],
      tables: ['skills', 'workflows'],
    },
  },
  {
    id: 'swarm',
    type: 'system',
    position: { x: 400, y: 200 },
    data: {
      label: 'THE SWARM \u2014 Kerrigan',
      status: 'pending',
      description: 'Supreme Authority & Coordination',
      tier: 'meta',
      category: 'kerrigan',
      brief:
        'Emergent multi-agent coordination system. Manages card lifecycle, three-tier locking, real-time agent coordination, progressive context loading, and vault sync. The unified execution layer.',
      phase: [0, 4],
      cards: ['DEA-035', 'DEA-042'],
      cardTags: ['#swarm', '#kerrigan', '#nexus'],
      tables: [
        'nexus_projects',
        'nexus_cards',
        'nexus_task_details',
        'nexus_comments',
        'nexus_locks',
        'nexus_events',
        'nexus_context_packages',
        'nexus_agent_sessions',
      ],
    },
  },
]

// ── PROJECT Tier Nodes ─────────────────────────────────────

const PROJECT_NODES: Node<EnhancedNodeData>[] = [
  {
    id: 'projects',
    type: 'system',
    position: { x: -100, y: 350 },
    data: {
      label: 'Projects',
      status: 'live',
      description: 'Portfolio Projects',
      tier: 'project',
      category: 'project',
      brief:
        'Project registry for the dea-exmachina portfolio. Each project has dashboard layout, bender assignments, kanban boards, and integration configs.',
      phase: [1, 2],
      cardTags: ['#project'],
      tables: ['projects', 'project_templates'],
    },
  },
  {
    id: 'kanban',
    type: 'system',
    position: { x: 100, y: 350 },
    data: {
      label: 'Kanban',
      status: 'live',
      description: 'Task Boards',
      tier: 'project',
      category: 'kanban',
      brief:
        'NEXUS kanban — project-scoped card lifecycle. Standard lanes (backlog → ready → in_progress → review → done) + bender dual-view. Subtasks, locking, context engine, event system.',
      phase: [1, 2],
      cardTags: ['#kanban'],
      tables: ['nexus_projects', 'nexus_cards', 'nexus_task_details', 'nexus_comments', 'nexus_locks', 'nexus_events'],
    },
  },
  {
    id: 'bender-tasks',
    type: 'system',
    position: { x: 300, y: 350 },
    data: {
      label: 'Bender Tasks',
      status: 'live',
      description: 'Agent Work Items',
      tier: 'project',
      category: 'bender_team',
      brief:
        'Work items assigned to bender agents. Each task has requirements, acceptance criteria, branch, status, and review workflow. Tasks are proposed → queued → executing → delivered → integrated.',
      phase: [1, 2],
      cardTags: ['#bender', '#task'],
      tables: ['bender_tasks'],
    },
  },
  {
    id: 'inbox',
    type: 'system',
    position: { x: 500, y: 350 },
    data: {
      label: 'Inbox',
      status: 'live',
      description: 'Message Queue',
      tier: 'project',
      category: 'project',
      brief:
        'Inbox for notes, links, files, and instructions. Items flow pending → processing → done. Webapp writes trigger local sync.',
      phase: [1, 2],
      cardTags: ['#inbox'],
      tables: ['inbox_items'],
    },
  },
]

// ── INFRASTRUCTURE Tier Nodes ──────────────────────────────

const INFRASTRUCTURE_NODES: Node<EnhancedNodeData>[] = [
  {
    id: 'supabase',
    type: 'infra',
    position: { x: 250, y: 500 },
    data: {
      label: 'Supabase',
      status: 'live',
      description: 'PostgreSQL + Realtime',
      tier: 'infrastructure',
      category: 'database',
      brief:
        'PostgreSQL database with Realtime subscriptions, Row Level Security, and auto-generated APIs. Primary data store for Control Center v2.',
      phase: [1, 2],
      secrets: [
        {
          variableName: 'SUPABASE_URL',
          secretType: 'URL',
          location: 'webapp',
          required: true,
        },
        {
          variableName: 'SUPABASE_SERVICE_KEY',
          secretType: 'API_KEY',
          location: 'webapp',
          required: true,
        },
        {
          variableName: 'NEXT_PUBLIC_SUPABASE_URL',
          secretType: 'URL',
          location: 'webapp',
          required: true,
        },
        {
          variableName: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
          secretType: 'API_KEY',
          location: 'webapp',
          required: true,
        },
      ],
    },
  },
  {
    id: 'vercel',
    type: 'infra',
    position: { x: 450, y: 500 },
    data: {
      label: 'Vercel',
      status: 'live',
      description: 'Edge Hosting',
      tier: 'infrastructure',
      category: 'hosting',
      brief:
        'Edge hosting and deployment platform. Serves Control Center webapp at dea-exmachina.xyz. Auto-deploys from GitHub master branch.',
      phase: [1],
      secrets: [
        {
          variableName: 'VERCEL_TOKEN',
          secretType: 'TOKEN',
          location: 'webapp',
          required: false,
        },
      ],
    },
  },
  {
    id: 'github',
    type: 'infra',
    position: { x: 50, y: 500 },
    data: {
      label: 'GitHub',
      status: 'live',
      description: 'Code Repository',
      tier: 'infrastructure',
      category: 'storage',
      brief:
        'Code repository and file storage. Vault (dea-exmachina) and webapp (control-center) repos. REST API for file reads/writes.',
      phase: [1],
      secrets: [
        {
          variableName: 'GITHUB_TOKEN',
          secretType: 'TOKEN',
          location: 'webapp',
          required: true,
        },
      ],
    },
  },
  {
    id: 'gcp-vm',
    type: 'infra',
    position: { x: 650, y: 500 },
    data: {
      label: 'GCP VM',
      status: 'live',
      description: 'dea Runtime',
      tier: 'infrastructure',
      category: 'runtime',
      brief:
        'Google Cloud e2-micro VM running dea_runtime.py. Polls Supabase messages table, processes with Claude API, responds via Realtime.',
      phase: [2],
      secrets: [],
    },
  },
  {
    id: 'google-oauth',
    type: 'infra',
    position: { x: 50, y: 600 },
    data: {
      label: 'Google OAuth',
      status: 'live',
      description: 'Sheets & Drive',
      tier: 'infrastructure',
      category: 'oauth',
      brief:
        'OAuth integration for Google Sheets and Drive. Used by job tracker and other vault scripts.',
      phase: [1],
      secrets: [
        {
          variableName: 'GOOGLE_CLIENT_ID',
          secretType: 'API_KEY',
          location: 'vault',
          required: true,
        },
        {
          variableName: 'GOOGLE_CLIENT_SECRET',
          secretType: 'SECRET',
          location: 'vault',
          required: true,
        },
        {
          variableName: 'GOOGLE_SHEET_ID',
          secretType: 'OTHER',
          location: 'vault',
          required: true,
        },
      ],
    },
  },
  {
    id: 'r2',
    type: 'infra',
    position: { x: 250, y: 600 },
    data: {
      label: 'Cloudflare R2',
      status: 'live',
      description: 'Object Storage',
      tier: 'infrastructure',
      category: 'storage',
      brief:
        'S3-compatible object storage for job batch files. Email worker writes here, job tracker reads.',
      phase: [1],
      secrets: [
        {
          variableName: 'R2_ENDPOINT',
          secretType: 'URL',
          location: 'vault',
          required: true,
        },
        {
          variableName: 'R2_KEY_ID',
          secretType: 'API_KEY',
          location: 'vault',
          required: true,
        },
        {
          variableName: 'R2_SECRET',
          secretType: 'SECRET',
          location: 'vault',
          required: true,
        },
      ],
    },
  },
  {
    id: 'api',
    type: 'infra',
    position: { x: 450, y: 600 },
    data: {
      label: 'API Routes',
      status: 'live',
      description: 'Next.js App Router',
      tier: 'infrastructure',
      category: 'api',
      brief:
        'Next.js 16 API routes. Server-side endpoints for all CRUD operations. Cookie-based auth, service role Supabase client.',
      phase: [1, 2],
      secrets: [
        {
          variableName: 'AUTH_SECRET',
          secretType: 'SECRET',
          location: 'webapp',
          required: true,
        },
      ],
    },
  },
  {
    id: 'ui',
    type: 'infra',
    position: { x: 650, y: 600 },
    data: {
      label: 'UI Layer',
      status: 'building',
      description: 'Dashboard Components',
      tier: 'infrastructure',
      category: 'api',
      brief:
        'React components for Control Center dashboard. Tailwind v4, shadcn/ui, react-grid-layout. Theme support (dark/light).',
      phase: [2],
      secrets: [],
    },
  },
]

// ── All Nodes Combined ─────────────────────────────────────

export const ARCHITECTURE_NODES: Node<EnhancedNodeData>[] = [
  ...META_NODES,
  ...PROJECT_NODES,
  ...INFRASTRUCTURE_NODES,
]

// ── Legacy KERRIGAN_NODES (backwards compatibility, deprecated) ──

export const KERRIGAN_NODES: Node<SystemNodeData | InfraNodeData>[] =
  ARCHITECTURE_NODES as Node<SystemNodeData | InfraNodeData>[]

// ── Enhanced Edges with Data Flow Types ────────────────────

export type EnhancedEdge = Edge & {
  data?: {
    dataType: DataFlowType
  }
}

export const ARCHITECTURE_EDGES: EnhancedEdge[] = [
  // META: Core SWARM connections
  {
    id: 'hive-creep',
    source: 'hive',
    target: 'creep',
    animated: true,
    label: 'teams.build',
    data: { dataType: 'event' },
  },
  {
    id: 'creep-evolution',
    source: 'creep',
    target: 'evolution',
    label: 'feeds context',
    data: { dataType: 'sync' },
  },
  {
    id: 'evolution-swarm',
    source: 'evolution',
    target: 'swarm',
    label: 'enables',
    data: { dataType: 'sync' },
  },
  {
    id: 'swarm-hive',
    source: 'swarm',
    target: 'hive',
    animated: true,
    label: 'triggers',
    data: { dataType: 'event' },
  },

  // META to PROJECT
  {
    id: 'hive-tasks',
    source: 'hive',
    target: 'bender-tasks',
    label: 'creates tasks',
    data: { dataType: 'api' },
  },
  {
    id: 'creep-kanban',
    source: 'creep',
    target: 'kanban',
    label: 'syncs cards',
    data: { dataType: 'sync' },
  },

  // PROJECT to INFRASTRUCTURE
  {
    id: 'projects-db',
    source: 'projects',
    target: 'supabase',
    style: { strokeDasharray: '5,5' },
    data: { dataType: 'api' },
  },
  {
    id: 'kanban-db',
    source: 'kanban',
    target: 'supabase',
    style: { strokeDasharray: '5,5' },
    data: { dataType: 'api' },
  },
  {
    id: 'tasks-db',
    source: 'bender-tasks',
    target: 'supabase',
    style: { strokeDasharray: '5,5' },
    data: { dataType: 'api' },
  },
  {
    id: 'inbox-db',
    source: 'inbox',
    target: 'supabase',
    style: { strokeDasharray: '5,5' },
    data: { dataType: 'api' },
  },

  // META to INFRASTRUCTURE
  {
    id: 'hive-db',
    source: 'hive',
    target: 'supabase',
    style: { strokeDasharray: '5,5' },
    data: { dataType: 'api' },
  },
  {
    id: 'creep-db',
    source: 'creep',
    target: 'supabase',
    style: { strokeDasharray: '5,5' },
    data: { dataType: 'api' },
  },
  {
    id: 'evolution-db',
    source: 'evolution',
    target: 'supabase',
    style: { strokeDasharray: '5,5' },
    data: { dataType: 'api' },
  },
  {
    id: 'swarm-db',
    source: 'swarm',
    target: 'supabase',
    style: { strokeDasharray: '5,5' },
    data: { dataType: 'api' },
  },

  // External webhooks
  {
    id: 'external-creep',
    source: 'github',
    target: 'creep',
    label: 'webhooks',
    data: { dataType: 'webhook' },
  },

  // Infrastructure stack
  {
    id: 'db-api',
    source: 'supabase',
    target: 'api',
    data: { dataType: 'api' },
  },
  {
    id: 'api-ui',
    source: 'api',
    target: 'ui',
    data: { dataType: 'api' },
  },
  {
    id: 'db-ui',
    source: 'supabase',
    target: 'ui',
    animated: true,
    label: 'realtime',
    data: { dataType: 'realtime' },
  },
  {
    id: 'db-vm',
    source: 'supabase',
    target: 'gcp-vm',
    label: 'polls',
    data: { dataType: 'api' },
  },
  {
    id: 'vercel-ui',
    source: 'vercel',
    target: 'ui',
    label: 'hosts',
    data: { dataType: 'file' },
  },
  {
    id: 'github-vercel',
    source: 'github',
    target: 'vercel',
    label: 'deploys',
    data: { dataType: 'file' },
  },
]

// ── Legacy KERRIGAN_EDGES (backwards compatibility, deprecated) ──

export const KERRIGAN_EDGES: Edge[] = ARCHITECTURE_EDGES

// ── Phase definitions ──────────────────────────────────────

export const PHASES = [
  { id: null, label: 'All', description: 'Show all nodes' },
  { id: 0, label: 'Architecture', description: 'System design phase' },
  { id: 1, label: 'Core Infra', description: 'HIVE, EVOLUTION, database' },
  { id: 2, label: 'Integration', description: 'CREEP, API routes' },
  { id: 3, label: 'Standards', description: 'EVOLUTION standards library' },
  { id: 4, label: 'Swarm', description: 'Emergent coordination' },
] as const

// ── Tier definitions ───────────────────────────────────────

export const TIERS = [
  { id: null, label: 'All', description: 'Show all tiers' },
  { id: 'meta', label: 'META', description: 'System-wide orchestration' },
  { id: 'project', label: 'PROJECT', description: 'Project-level entities' },
  {
    id: 'infrastructure',
    label: 'INFRA',
    description: 'External services & hosting',
  },
] as const

// ── Helper functions ───────────────────────────────────────

export function getNodesForPhase(phase: number | null): string[] {
  if (phase === null) return ARCHITECTURE_NODES.map((n) => n.id)
  return ARCHITECTURE_NODES.filter((n) => n.data.phase.includes(phase)).map(
    (n) => n.id
  )
}

export function getNodesForTier(tier: ArchitectureTier | null): string[] {
  if (tier === null) return ARCHITECTURE_NODES.map((n) => n.id)
  return ARCHITECTURE_NODES.filter((n) => n.data.tier === tier).map((n) => n.id)
}

export function getNodeById(id: string): Node<EnhancedNodeData> | undefined {
  return ARCHITECTURE_NODES.find((n) => n.id === id)
}

// ── Status color mapping ───────────────────────────────────

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

// ── Tier color mapping ─────────────────────────────────────

export const TIER_COLORS = {
  meta: {
    border: 'border-purple-500',
    bg: 'bg-purple-500/10',
    dot: 'bg-purple-400',
    text: 'text-purple-400',
    accent: 'rgb(168, 85, 247)',
  },
  project: {
    border: 'border-blue-500',
    bg: 'bg-blue-500/10',
    dot: 'bg-blue-400',
    text: 'text-blue-400',
    accent: 'rgb(59, 130, 246)',
  },
  infrastructure: {
    border: 'border-emerald-500',
    bg: 'bg-emerald-500/10',
    dot: 'bg-emerald-400',
    text: 'text-emerald-400',
    accent: 'rgb(16, 185, 129)',
  },
} as const

// ── Data flow color mapping ────────────────────────────────

export const DATA_FLOW_COLORS = {
  event: { stroke: 'stroke-amber-400', hex: 'rgb(251, 191, 36)' },
  file: { stroke: 'stroke-cyan-400', hex: 'rgb(34, 211, 238)' },
  api: { stroke: 'stroke-blue-400', hex: 'rgb(96, 165, 250)' },
  webhook: { stroke: 'stroke-pink-400', hex: 'rgb(244, 114, 182)' },
  realtime: { stroke: 'stroke-emerald-400', hex: 'rgb(52, 211, 153)' },
  sync: { stroke: 'stroke-purple-400', hex: 'rgb(192, 132, 252)' },
} as const
