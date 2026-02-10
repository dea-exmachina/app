import type { Node, Edge } from 'reactflow'
import type {
  ArchitectureTier,
  NodeCategory,
  NodeStatus,
  WorkflowStep,
  SecretReference,
  DataFlowType,
} from '@/types/architecture'
import { DATA_FLOW_COLORS } from '@/types/architecture'

// ── Node Data Interface ──────────────────────────────────────

export interface EnhancedNodeData {
  label: string
  status: NodeStatus
  description: string
  tier: ArchitectureTier
  category: NodeCategory
  brief: string
  cards?: string[]
  cardTags?: string[]
  tables?: string[]
  secrets?: SecretReference[]
  workflows?: WorkflowStep[]
}

export type { NodeStatus }

// ── Group Node Data ──────────────────────────────────────────

export interface TierGroupData {
  label: string
  tier: ArchitectureTier
  description: string
  nodeCount: number
}

// ── Tier Group Containers ────────────────────────────────────
// React Flow group nodes act as parents for child nodes.
// Children use relative positioning within the parent bounds.

const TIER_GROUPS: Node<TierGroupData>[] = [
  {
    id: 'council-group',
    type: 'tierGroup',
    position: { x: 0, y: 0 },
    data: {
      label: 'Tier 0 — Council',
      tier: 'council',
      description: 'Governance constructs — strategy, arbitration, standards',
      nodeCount: 5,
    },
    style: {
      width: 920,
      height: 280,
      padding: 20,
    },
  },
  {
    id: 'advisory-group',
    type: 'tierGroup',
    position: { x: 960, y: 0 },
    data: {
      label: 'Advisory',
      tier: 'advisory',
      description: 'Outside counsel — research, not governance',
      nodeCount: 1,
    },
    style: {
      width: 220,
      height: 280,
      padding: 20,
    },
  },
  {
    id: 'operations-group',
    type: 'tierGroup',
    position: { x: 0, y: 340 },
    data: {
      label: 'Tier 1 — Operations',
      tier: 'operations',
      description: 'Execution layer — kanban, benders, inbox, projects, skills, workflows',
      nodeCount: 9,
    },
    style: {
      width: 1180,
      height: 280,
      padding: 20,
    },
  },
  {
    id: 'instance-group',
    type: 'tierGroup',
    position: { x: 0, y: 680 },
    data: {
      label: 'Tier 2 — Instance',
      tier: 'instance',
      description: 'Per-user dea-exmachina vaults — local, private, independent',
      nodeCount: 3,
    },
    style: {
      width: 560,
      height: 250,
      padding: 20,
    },
  },
  {
    id: 'infra-group',
    type: 'tierGroup',
    position: { x: 0, y: 990 },
    data: {
      label: 'Tier ∞ — Infrastructure',
      tier: 'infrastructure',
      description: 'Cross-cutting services — hosting, database, storage, auth',
      nodeCount: 9,
    },
    style: {
      width: 1180,
      height: 280,
      padding: 20,
    },
  },
]

// ── Tier 0: Council (Governance Constructs) ──────────────────

const COUNCIL_NODES: Node<EnhancedNodeData>[] = [
  {
    id: 'kerrigan',
    type: 'construct',
    position: { x: 350, y: 50 },
    parentNode: 'council-group',
    extent: 'parent',
    data: {
      label: 'THE SWARM — Kerrigan',
      status: 'live',
      description: 'Supreme Authority',
      tier: 'council',
      category: 'construct',
      brief:
        'Supreme governance authority. Owns strategy, arbitration, meta-framework integrity, and delegation policy. Manages NEXUS card lifecycle and multi-agent coordination.',
      cards: ['DEA-035', 'DEA-042', 'DEA-047'],
      cardTags: ['#swarm', '#kerrigan'],
      tables: [
        'nexus_cards',
        'nexus_events',
        'meta_constructs',
      ],
    },
  },
  {
    id: 'architect',
    type: 'construct',
    position: { x: 30, y: 50 },
    parentNode: 'council-group',
    extent: 'parent',
    data: {
      label: 'HIVE — Architect',
      status: 'live',
      description: 'Team Construction',
      tier: 'council',
      category: 'construct',
      brief:
        'Team construction factory. Assembles bender teams from goal descriptions using the capability registry. Produces team manifests with roles, identities, task breakdown, and context packages.',
      cards: ['DEA-031'],
      cardTags: ['#hive', '#swarm'],
      tables: [
        'bender_identities',
        'bender_teams',
        'bender_platforms',
      ],
    },
  },
  {
    id: 'abathur',
    type: 'construct',
    position: { x: 190, y: 150 },
    parentNode: 'council-group',
    extent: 'parent',
    data: {
      label: 'EVOLUTION — Abathur',
      status: 'live',
      description: 'Quality & Standards',
      tier: 'council',
      category: 'construct',
      brief:
        'Quality and knowledge management. Maintains capability registry, builds context packages, extracts learnings from completed work, enforces standards and compliance.',
      cards: ['DEA-034'],
      cardTags: ['#evolution', '#swarm'],
      tables: ['skills', 'workflows', 'bender_performance'],
    },
  },
  {
    id: 'zagara',
    type: 'construct',
    position: { x: 510, y: 150 },
    parentNode: 'council-group',
    extent: 'parent',
    data: {
      label: 'CREEP — Zagara',
      status: 'building',
      description: 'External Orchestration',
      tier: 'council',
      category: 'construct',
      brief:
        'External orchestration engine. Receives webhooks from external platforms, transforms to internal entities, syncs bidirectionally with circuit breakers, emits events.',
      cards: ['DEA-032', 'DEA-040'],
      cardTags: ['#creep', '#swarm'],
      tables: ['queen_events', 'agent_health', 'webhook_configs', 'sync_state'],
      workflows: [
        { order: 1, name: 'Webhook Receive', type: 'webhook', description: 'Accept inbound webhooks' },
        { order: 2, name: 'Transform', type: 'transform', description: 'Convert to internal format' },
        { order: 3, name: 'Store Event', type: 'store', description: 'Persist to queen_events' },
        { order: 4, name: 'Sync', type: 'sync', description: 'Push to kanban with circuit breakers' },
        { order: 5, name: 'Emit', type: 'emit', description: 'Broadcast via Supabase Realtime' },
      ],
    },
  },
  {
    id: 'keeper',
    type: 'construct',
    position: { x: 700, y: 50 },
    parentNode: 'council-group',
    extent: 'parent',
    data: {
      label: 'VAULT — Keeper',
      status: 'live',
      description: 'Data Custodianship',
      tier: 'council',
      category: 'construct',
      brief:
        'Data custodianship. Manages architecture annotations, secrets registry, inbox items, session records, and INDEX file maintenance across the vault.',
      cards: ['DEA-033'],
      cardTags: ['#vault', '#swarm'],
      tables: ['architecture_annotations', 'architecture_secrets', 'inbox_items'],
    },
  },
]

// ── Advisory (Outside Counsel) ───────────────────────────────

const ADVISORY_NODES: Node<EnhancedNodeData>[] = [
  {
    id: 'overseer',
    type: 'construct',
    position: { x: 30, y: 90 },
    parentNode: 'advisory-group',
    extent: 'parent',
    data: {
      label: 'INTEL — Overseer',
      status: 'live',
      description: 'External Intelligence',
      tier: 'advisory',
      category: 'advisory',
      brief:
        'Advisory entity — researches external tools, technologies, best practices. Provides recommendations to inform Council decisions. Not a governance construct.',
      cardTags: ['#overseer', '#intel'],
      tables: [],
    },
  },
]

// ── Tier 1: Operations (Execution Layer) ─────────────────────

const OPERATIONS_NODES: Node<EnhancedNodeData>[] = [
  {
    id: 'nexus',
    type: 'system',
    position: { x: 30, y: 50 },
    parentNode: 'operations-group',
    extent: 'parent',
    data: {
      label: 'NEXUS Kanban',
      status: 'live',
      description: 'Card Lifecycle & Boards',
      tier: 'operations',
      category: 'operational',
      brief:
        'Project-scoped kanban system. Standard lanes (backlog → ready → in_progress → review → done) + bender dual-view. Subtasks, locking, context engine, event system.',
      cardTags: ['#kanban', '#nexus'],
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
  {
    id: 'bender-mgmt',
    type: 'system',
    position: { x: 200, y: 50 },
    parentNode: 'operations-group',
    extent: 'parent',
    data: {
      label: 'Bender Management',
      status: 'live',
      description: 'Agent Workforce',
      tier: 'operations',
      category: 'operational',
      brief:
        'Bender lifecycle management. EWMA scoring, identity persistence, task assignment, team composition, platform routing. Named benders with slugs.',
      cardTags: ['#bender'],
      tables: [
        'bender_identities',
        'bender_performance',
        'bender_tasks',
        'bender_teams',
        'bender_team_members',
        'bender_platforms',
      ],
    },
  },
  {
    id: 'inbox',
    type: 'system',
    position: { x: 370, y: 50 },
    parentNode: 'operations-group',
    extent: 'parent',
    data: {
      label: 'Inbox',
      status: 'live',
      description: 'Message Queue',
      tier: 'operations',
      category: 'operational',
      brief:
        'Inbox for notes, links, files, and instructions. Items flow pending → processing → done. Webapp writes trigger local sync via /dea-inbox.',
      cardTags: ['#inbox'],
      tables: ['inbox_items'],
    },
  },
  {
    id: 'projects',
    type: 'system',
    position: { x: 540, y: 50 },
    parentNode: 'operations-group',
    extent: 'parent',
    data: {
      label: 'Projects',
      status: 'live',
      description: 'Portfolio Registry',
      tier: 'operations',
      category: 'operational',
      brief:
        'Project registry for the dea-exmachina portfolio. Each project has dashboard layout, bender assignments, kanban boards, and integration configs.',
      cardTags: ['#project'],
      tables: ['projects', 'project_templates', 'project_benders'],
    },
  },
  {
    id: 'skills-reg',
    type: 'system',
    position: { x: 710, y: 50 },
    parentNode: 'operations-group',
    extent: 'parent',
    data: {
      label: 'Skills Registry',
      status: 'live',
      description: 'Skill Definitions',
      tier: 'operations',
      category: 'operational',
      brief:
        'Registry of all dea skills (40+). Each skill has triggers, workflows, dependencies, and platform requirements. Skills are the atomic unit of capability.',
      cardTags: ['#skills'],
      tables: ['skills'],
    },
  },
  {
    id: 'workflows-reg',
    type: 'system',
    position: { x: 880, y: 50 },
    parentNode: 'operations-group',
    extent: 'parent',
    data: {
      label: 'Workflows',
      status: 'live',
      description: 'Process Templates',
      tier: 'operations',
      category: 'operational',
      brief:
        'Workflow registry (31 workflows). Repeatable process templates with phases, gates, and checkpoints. Public (shared) and private (user-only) variants.',
      cardTags: ['#workflows'],
      tables: ['workflows'],
    },
  },
  {
    id: 'teams',
    type: 'system',
    position: { x: 1050, y: 50 },
    parentNode: 'operations-group',
    extent: 'parent',
    data: {
      label: 'Teams',
      status: 'live',
      description: 'Team Composition',
      tier: 'operations',
      category: 'operational',
      brief:
        'Team management — compositions of named benders assembled by HIVE. Each team has manifests, sequencing, file ownership, and coordination rules.',
      cardTags: ['#teams'],
      tables: ['bender_teams', 'bender_team_members', 'identity_project_context'],
    },
  },
  {
    id: 'design-system',
    type: 'system',
    position: { x: 30, y: 170 },
    parentNode: 'operations-group',
    extent: 'parent',
    data: {
      label: 'Design System',
      status: 'live',
      description: 'UI Components',
      tier: 'operations',
      category: 'operational',
      brief:
        'shadcn/ui component library with Tailwind v4. Provides Button, Card, Badge, Tabs, Dialog, Skeleton, and other primitives. Tier-colored badges and status indicators throughout.',
      tables: [],
    },
  },
  {
    id: 'widget-system',
    type: 'system',
    position: { x: 200, y: 170 },
    parentNode: 'operations-group',
    extent: 'parent',
    data: {
      label: 'Widget System',
      status: 'live',
      description: 'Layout Engine',
      tier: 'operations',
      category: 'operational',
      brief:
        'react-grid-layout v2 widget engine. Each page is a WidgetGrid with draggable, resizable widget cards. Persists layouts to localStorage. Powers all dashboard pages.',
      tables: [],
    },
  },
]

// ── Tier 2: Instance (Per-User Vaults) ───────────────────────

const INSTANCE_NODES: Node<EnhancedNodeData>[] = [
  {
    id: 'dea-instance',
    type: 'system',
    position: { x: 30, y: 60 },
    parentNode: 'instance-group',
    extent: 'parent',
    data: {
      label: 'dea Instance',
      status: 'live',
      description: 'Local AI Partner',
      tier: 'instance',
      category: 'instance',
      brief:
        'The local dea-exmachina instance. Runs on Claude Code, interacts via terminal. Holds identity, voice, decision authority. Each instance is independent.',
      cardTags: ['#dea'],
      tables: [],
    },
  },
  {
    id: 'vault',
    type: 'system',
    position: { x: 200, y: 60 },
    parentNode: 'instance-group',
    extent: 'parent',
    data: {
      label: 'Vault (Obsidian)',
      status: 'live',
      description: 'Knowledge Store',
      tier: 'instance',
      category: 'instance',
      brief:
        'File-system knowledge store synced via git. Contains CLAUDE.md, identity/, benders/, workflows/, templates/, logging/. Obsidian-compatible markdown.',
      cardTags: ['#vault'],
      tables: [],
    },
  },
  {
    id: 'logging',
    type: 'system',
    position: { x: 370, y: 60 },
    parentNode: 'instance-group',
    extent: 'parent',
    data: {
      label: 'Logging & Records',
      status: 'live',
      description: 'Session History',
      tier: 'instance',
      category: 'instance',
      brief:
        'Session logging and records. Daily logs, error tracking, feedback capture, plan archives. Provides audit trail and learning extraction source.',
      cardTags: ['#logging'],
      tables: [],
    },
  },
]

// ── Tier ∞: Infrastructure (Cross-Cutting Services) ──────────

const INFRASTRUCTURE_NODES: Node<EnhancedNodeData>[] = [
  {
    id: 'supabase',
    type: 'infra',
    position: { x: 30, y: 60 },
    parentNode: 'infra-group',
    extent: 'parent',
    data: {
      label: 'Supabase',
      status: 'live',
      description: 'PostgreSQL + Realtime',
      tier: 'infrastructure',
      category: 'database',
      brief:
        'PostgreSQL database with Realtime subscriptions, RLS, and auto-generated APIs. 40 tables. Primary data store for Control Center v2.',
      secrets: [
        { variableName: 'SUPABASE_URL', secretType: 'URL', location: 'webapp', required: true },
        { variableName: 'SUPABASE_SERVICE_KEY', secretType: 'API_KEY', location: 'webapp', required: true },
        { variableName: 'NEXT_PUBLIC_SUPABASE_URL', secretType: 'URL', location: 'webapp', required: true },
        { variableName: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', secretType: 'API_KEY', location: 'webapp', required: true },
      ],
    },
  },
  {
    id: 'vercel',
    type: 'infra',
    position: { x: 200, y: 60 },
    parentNode: 'infra-group',
    extent: 'parent',
    data: {
      label: 'Vercel',
      status: 'live',
      description: 'Edge Hosting',
      tier: 'infrastructure',
      category: 'hosting',
      brief:
        'Edge hosting platform. Serves Control Center at dea-exmachina.xyz. Auto-deploys from GitHub master. Card branches get preview URLs.',
      secrets: [
        { variableName: 'VERCEL_TOKEN', secretType: 'TOKEN', location: 'webapp', required: false },
      ],
    },
  },
  {
    id: 'github',
    type: 'infra',
    position: { x: 370, y: 60 },
    parentNode: 'infra-group',
    extent: 'parent',
    data: {
      label: 'GitHub',
      status: 'live',
      description: 'Code + API',
      tier: 'infrastructure',
      category: 'storage',
      brief:
        'Code repository and file storage. Vault (dea-exmachina) and webapp (control-center) repos. REST API for file reads/writes.',
      secrets: [
        { variableName: 'GITHUB_TOKEN', secretType: 'TOKEN', location: 'webapp', required: true },
      ],
    },
  },
  {
    id: 'gcp-vm',
    type: 'infra',
    position: { x: 540, y: 60 },
    parentNode: 'infra-group',
    extent: 'parent',
    data: {
      label: 'GCP VM',
      status: 'live',
      description: 'dea Runtime',
      tier: 'infrastructure',
      category: 'runtime',
      brief:
        'Google Cloud e2-micro VM running dea_runtime.py. Polls Supabase messages table, processes with Claude API, responds via Realtime.',
    },
  },
  {
    id: 'google-oauth',
    type: 'infra',
    position: { x: 710, y: 60 },
    parentNode: 'infra-group',
    extent: 'parent',
    data: {
      label: 'Google OAuth',
      status: 'live',
      description: 'Auth + Sheets',
      tier: 'infrastructure',
      category: 'oauth',
      brief:
        'OAuth integration for Google Sheets and Drive. Used by job tracker and other vault scripts.',
      secrets: [
        { variableName: 'GOOGLE_CLIENT_ID', secretType: 'API_KEY', location: 'vault', required: true },
        { variableName: 'GOOGLE_CLIENT_SECRET', secretType: 'SECRET', location: 'vault', required: true },
      ],
    },
  },
  {
    id: 'r2',
    type: 'infra',
    position: { x: 880, y: 60 },
    parentNode: 'infra-group',
    extent: 'parent',
    data: {
      label: 'Cloudflare R2',
      status: 'live',
      description: 'Object Storage',
      tier: 'infrastructure',
      category: 'storage',
      brief:
        'S3-compatible object storage for job batch files. Email worker writes here, job tracker reads.',
      secrets: [
        { variableName: 'R2_ENDPOINT', secretType: 'URL', location: 'vault', required: true },
        { variableName: 'R2_KEY_ID', secretType: 'API_KEY', location: 'vault', required: true },
        { variableName: 'R2_SECRET', secretType: 'SECRET', location: 'vault', required: true },
      ],
    },
  },
  {
    id: 'resend',
    type: 'infra',
    position: { x: 1050, y: 60 },
    parentNode: 'infra-group',
    extent: 'parent',
    data: {
      label: 'Resend',
      status: 'pending',
      description: 'Email Service',
      tier: 'infrastructure',
      category: 'email',
      brief:
        'Transactional email service. Sends from dea@dea-exmachina.xyz. Used by /dea-email skill and notification pipeline.',
      secrets: [
        { variableName: 'RESEND_API_KEY', secretType: 'API_KEY', location: 'webapp', required: true },
      ],
    },
  },
  {
    id: 'discord',
    type: 'infra',
    position: { x: 540, y: 170 },
    parentNode: 'infra-group',
    extent: 'parent',
    data: {
      label: 'Discord',
      status: 'live',
      description: 'Webhooks',
      tier: 'infrastructure',
      category: 'messaging',
      brief:
        'Discord webhook integration. Receives NEXUS comment notifications and bender status updates.',
      secrets: [
        { variableName: 'DISCORD_WEBHOOK_URL', secretType: 'URL', location: 'webapp', required: true },
      ],
    },
  },
  {
    id: 'mcp-server',
    type: 'infra',
    position: { x: 710, y: 170 },
    parentNode: 'infra-group',
    extent: 'parent',
    data: {
      label: 'MCP Server',
      status: 'live',
      description: 'Supabase MCP',
      tier: 'infrastructure',
      category: 'api',
      brief:
        'Model Context Protocol server (@supabase/mcp-server-supabase). Provides execute_sql, apply_migration, list_tables tools. Used by dea for all interactive Supabase queries.',
      secrets: [
        { variableName: 'SUPABASE_ACCESS_TOKEN', secretType: 'TOKEN', location: 'vault', required: true },
      ],
    },
  },
]

// ── All Nodes Combined ───────────────────────────────────────

export const ARCHITECTURE_NODES: Node<EnhancedNodeData | TierGroupData>[] = [
  ...TIER_GROUPS,
  ...COUNCIL_NODES,
  ...ADVISORY_NODES,
  ...OPERATIONS_NODES,
  ...INSTANCE_NODES,
  ...INFRASTRUCTURE_NODES,
]

// ── Enhanced Edges with Data Flow Types & Color ──────────────

export type EnhancedEdge = Edge & {
  data?: {
    dataType: DataFlowType
  }
}

/** Apply data-flow color to edge style */
function coloredEdge(
  id: string,
  source: string,
  target: string,
  dataType: DataFlowType,
  opts?: {
    label?: string
    animated?: boolean
    dashed?: boolean
  }
): EnhancedEdge {
  const color = DATA_FLOW_COLORS[dataType].hex
  return {
    id,
    source,
    target,
    data: { dataType },
    style: {
      stroke: color,
      strokeWidth: 2,
      ...(opts?.dashed ? { strokeDasharray: '6,3' } : {}),
    },
    ...(opts?.animated ? { animated: true } : {}),
    ...(opts?.label
      ? {
          label: opts.label,
          labelStyle: { fill: color, fontSize: 10, fontWeight: 500 },
          labelBgStyle: {
            fill: 'hsl(var(--background))',
            fillOpacity: 0.8,
          },
        }
      : {}),
  }
}

export const ARCHITECTURE_EDGES: EnhancedEdge[] = [
  // ── Governance → Operations (Tier 0 → Tier 1) ─────────────
  coloredEdge('kerrigan-nexus', 'kerrigan', 'nexus', 'event', { label: 'card lifecycle', animated: true }),
  coloredEdge('architect-bender', 'architect', 'bender-mgmt', 'api', { label: 'creates teams' }),
  coloredEdge('architect-nexus', 'architect', 'nexus', 'api', { label: 'task breakdown' }),
  coloredEdge('abathur-bender', 'abathur', 'bender-mgmt', 'api', { label: 'compliance scoring' }),
  coloredEdge('abathur-skills', 'abathur', 'skills-reg', 'sync', { label: 'standards' }),
  coloredEdge('abathur-workflows', 'abathur', 'workflows-reg', 'sync', { label: 'quality gates' }),
  coloredEdge('zagara-nexus', 'zagara', 'nexus', 'sync', { label: 'external → cards' }),
  coloredEdge('keeper-inbox', 'keeper', 'inbox', 'file', { label: 'inbox mgmt' }),
  coloredEdge('keeper-logging', 'keeper', 'logging', 'file', { label: 'session records' }),
  coloredEdge('keeper-projects', 'keeper', 'projects', 'file', { label: 'INDEX maintenance' }),

  // ── Advisory → Council ─────────────────────────────────────
  coloredEdge('overseer-kerrigan', 'overseer', 'kerrigan', 'api', { label: 'advises', dashed: true }),

  // ── Operations ↔ Operations (Tier 1 internal) ──────────────
  coloredEdge('nexus-bender', 'nexus', 'bender-mgmt', 'event', { label: 'task assignment', animated: true }),
  coloredEdge('nexus-projects', 'nexus', 'projects', 'api', { label: 'project cards' }),
  coloredEdge('bender-teams', 'bender-mgmt', 'teams', 'api', { label: 'composition' }),
  coloredEdge('bender-skills', 'bender-mgmt', 'skills-reg', 'api', { label: 'capability lookup' }),
  coloredEdge('inbox-nexus', 'inbox', 'nexus', 'api', { label: 'inbox → card' }),
  coloredEdge('workflows-skills', 'workflows-reg', 'skills-reg', 'sync', { label: 'skill links' }),

  // ── Operations → Infrastructure (Tier 1 → Infra) ──────────
  coloredEdge('nexus-db', 'nexus', 'supabase', 'api', { dashed: true }),
  coloredEdge('bender-db', 'bender-mgmt', 'supabase', 'api', { dashed: true }),
  coloredEdge('inbox-db', 'inbox', 'supabase', 'api', { dashed: true }),
  coloredEdge('projects-db', 'projects', 'supabase', 'api', { dashed: true }),
  coloredEdge('skills-db', 'skills-reg', 'supabase', 'api', { dashed: true }),
  coloredEdge('workflows-db', 'workflows-reg', 'supabase', 'api', { dashed: true }),

  // ── Council → Infrastructure ───────────────────────────────
  coloredEdge('kerrigan-db', 'kerrigan', 'supabase', 'api', { dashed: true }),
  coloredEdge('zagara-db', 'zagara', 'supabase', 'api', { dashed: true }),

  // ── Instance ↔ Operations (Tier 2 ↔ Tier 1) ───────────────
  coloredEdge('dea-nexus', 'dea-instance', 'nexus', 'api', { label: 'card updates' }),
  coloredEdge('dea-bender', 'dea-instance', 'bender-mgmt', 'api', { label: 'invokes benders' }),
  coloredEdge('vault-github', 'vault', 'github', 'sync', { label: 'git push/pull' }),
  coloredEdge('vault-inbox', 'vault', 'inbox', 'file', { label: 'file sync' }),

  // ── Infrastructure internal ────────────────────────────────
  coloredEdge('supabase-vercel', 'supabase', 'vercel', 'api', { label: 'API routes' }),
  coloredEdge('supabase-gcp', 'supabase', 'gcp-vm', 'api', { label: 'polls' }),
  coloredEdge('supabase-discord', 'supabase', 'discord', 'webhook', { label: 'notifications' }),
  coloredEdge('github-vercel', 'github', 'vercel', 'file', { label: 'auto-deploy' }),
  coloredEdge('resend-gcp', 'resend', 'gcp-vm', 'api', { label: 'email sending' }),

  // ── External → Infrastructure ──────────────────────────────
  coloredEdge('github-zagara', 'github', 'zagara', 'webhook', { label: 'webhooks', animated: true }),

  // ── MCP Server ────────────────────────────────────────────
  coloredEdge('mcp-supabase', 'mcp-server', 'supabase', 'api', { label: 'SQL queries' }),
  coloredEdge('dea-mcp', 'dea-instance', 'mcp-server', 'api', { label: 'MCP tools' }),

  // ── Design/Widget systems ─────────────────────────────────
  coloredEdge('widget-vercel', 'widget-system', 'vercel', 'api', { dashed: true }),
]

// ── Tier definitions ─────────────────────────────────────────

export const TIERS = [
  { id: null, label: 'All', description: 'Show all tiers' },
  { id: 'council' as const, label: 'Council', description: 'Governance constructs' },
  { id: 'advisory' as const, label: 'Advisory', description: 'Outside counsel' },
  { id: 'operations' as const, label: 'Operations', description: 'Execution layer' },
  { id: 'instance' as const, label: 'Instance', description: 'Per-user vaults' },
  { id: 'infrastructure' as const, label: 'Infra', description: 'Cross-cutting services' },
] as const

// ── Helper functions ─────────────────────────────────────────

export function getNodesForTier(tier: ArchitectureTier | null): string[] {
  if (tier === null) return ARCHITECTURE_NODES.map((n) => n.id)
  return ARCHITECTURE_NODES.filter((n) => {
    const data = n.data as EnhancedNodeData | TierGroupData
    return 'tier' in data && data.tier === tier
  }).map((n) => n.id)
}

export function getNodeById(id: string): Node<EnhancedNodeData> | undefined {
  return ARCHITECTURE_NODES.find((n) => n.id === id) as Node<EnhancedNodeData> | undefined
}

export function getChildNodes(groupId: string): Node<EnhancedNodeData>[] {
  return ARCHITECTURE_NODES.filter(
    (n) => n.parentNode === groupId
  ) as Node<EnhancedNodeData>[]
}

export function getEdgesForNode(nodeId: string): EnhancedEdge[] {
  return ARCHITECTURE_EDGES.filter(
    (e) => e.source === nodeId || e.target === nodeId
  )
}

// ── Status color mapping ─────────────────────────────────────

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

// ── Re-export tier/flow colors from types ────────────────────

export { TIER_COLORS, DATA_FLOW_COLORS } from '@/types/architecture'

// ── Legacy exports (backwards compatibility) ─────────────────

export const KERRIGAN_NODES = ARCHITECTURE_NODES
export const KERRIGAN_EDGES = ARCHITECTURE_EDGES
