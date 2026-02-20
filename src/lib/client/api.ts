// Typed fetch wrappers for all API endpoints
// All return Promise<T> where T is the data type (unwrapped from ApiResponse)

import type { ApiResponse, ApiError } from '@/types/api'
import type { DashboardSummary } from '@/types/dashboard'
import type { KanbanBoard, BoardSummary, HandoffSection } from '@/types/kanban'
import type { Skill, SkillDetail } from '@/types/skill'
import type { Workflow } from '@/types/workflow'
import type {
  BenderPlatform,
  BenderTask,
  BenderTaskCreateRequest,
  BenderTeam,
} from '@/types/bender'
import type { ProjectLegacy as Project, ProjectDetail, ProjectDashboardData, ProjectNotes, ProjectLink } from '@/types/project'
import type {
  InboxItem,
  InboxCreateRequest,
  InboxUpdateRequest,
  InboxFilter,
} from '@/types/inbox'
import type { Canvas, CanvasSummary, CreateCanvasInput, UpdateCanvasInput } from '@/types/canvas'
import type { NexusCard, NexusComment, NexusEvent, CardCommentSummary, ReleaseQueueResponse } from '@/types/nexus'
import type {
  TechStackItem,
  TechStackCreateRequest,
  TechStackUpdateRequest,
  ProjectWorkflow,
  WorkflowCreateRequest,
  WorkflowUpdateRequest,
} from '@/types/techstack'

async function fetchApi<T>(path: string): Promise<{ data: T; cached: boolean }> {
  const res = await fetch(path)
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
  const json: ApiResponse<T> = await res.json()
  return json
}

export async function getDashboardSummary(): Promise<{
  data: DashboardSummary
  cached: boolean
}> {
  return fetchApi<DashboardSummary>('/api/dashboard/summary')
}

export async function getHandoff(): Promise<{
  data: HandoffSection
  cached: boolean
}> {
  return fetchApi<HandoffSection>('/api/dashboard/handoff')
}

export async function getBoards(): Promise<{
  data: BoardSummary[]
  cached: boolean
}> {
  return fetchApi<BoardSummary[]>('/api/kanban/boards')
}

export async function getBoard(
  id: string,
  filter?: { start?: Date; end?: Date }
): Promise<{
  data: KanbanBoard
  cached: boolean
}> {
  let url = `/api/kanban/boards/${id}`
  if (filter?.start || filter?.end) {
    const params = new URLSearchParams()
    if (filter.start) params.set('done_after', filter.start.toISOString())
    if (filter.end) params.set('done_before', filter.end.toISOString())
    url += `?${params.toString()}`
  }
  return fetchApi<KanbanBoard>(url)
}

export async function getUnifiedBoard(
  project?: string
): Promise<{
  data: KanbanBoard
  cached: boolean
}> {
  const url = project
    ? `/api/kanban/unified?project=${encodeURIComponent(project)}`
    : '/api/kanban/unified'
  return fetchApi<KanbanBoard>(url)
}

export async function getSkills(): Promise<{ data: Skill[]; cached: boolean }> {
  return fetchApi<Skill[]>('/api/skills')
}

export async function getSkill(name: string): Promise<{
  data: SkillDetail
  cached: boolean
}> {
  return fetchApi<SkillDetail>(`/api/skills/${name}`)
}

export async function getWorkflows(): Promise<{
  data: Workflow[]
  cached: boolean
}> {
  return fetchApi<Workflow[]>('/api/workflows')
}

export async function getWorkflow(name: string): Promise<{
  data: Workflow
  cached: boolean
}> {
  return fetchApi<Workflow>(`/api/workflows/${name}`)
}

export async function getPlatforms(): Promise<{
  data: BenderPlatform[]
  cached: boolean
}> {
  return fetchApi<BenderPlatform[]>('/api/benders/platforms')
}

export async function getPlatform(slug: string): Promise<{
  data: BenderPlatform
  cached: boolean
}> {
  return fetchApi<BenderPlatform>(`/api/benders/platforms/${slug}`)
}

export async function getTeams(): Promise<{
  data: BenderTeam[]
  cached: boolean
}> {
  return fetchApi<BenderTeam[]>('/api/benders/teams')
}

export async function getTeam(name: string): Promise<{
  data: BenderTeam
  cached: boolean
}> {
  return fetchApi<BenderTeam>(`/api/benders/teams/${name}`)
}

export async function getTasks(): Promise<{
  data: BenderTask[]
  cached: boolean
}> {
  return fetchApi<BenderTask[]>('/api/benders/tasks')
}

export async function getTask(taskId: string): Promise<{
  data: BenderTask
  cached: boolean
}> {
  return fetchApi<BenderTask>(`/api/benders/tasks/${taskId}`)
}

export async function createTask(
  task: BenderTaskCreateRequest
): Promise<{ data: BenderTask; cached: boolean }> {
  const res = await fetch('/api/benders/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
  return res.json()
}

// NEXUS Card Operations
export async function getCard(
  cardId: string
): Promise<{ data: NexusCard; cached: boolean }> {
  return fetchApi<NexusCard>(`/api/nexus/cards/${cardId}`)
}

export async function getCardChildren(
  parentId: string
): Promise<{ data: NexusCard[]; cached: boolean }> {
  return fetchApi<NexusCard[]>(`/api/nexus/cards?parent_id=${parentId}`)
}

export async function moveCard(
  cardId: string,
  lane: string
): Promise<void> {
  const res = await fetch(`/api/nexus/cards/${cardId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lane }),
  })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
}

export async function updateCard(
  cardId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`/api/nexus/cards/${cardId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
}

// NEXUS Comment Operations
export async function getComments(cardId: string): Promise<{
  data: NexusComment[]
  cached: boolean
}> {
  return fetchApi<NexusComment[]>(`/api/nexus/cards/${cardId}/comments`)
}

export async function getCardEvents(
  cardId: string
): Promise<{ data: NexusEvent[]; cached: boolean }> {
  return fetchApi<NexusEvent[]>(`/api/nexus/cards/${cardId}/events`)
}

export async function postComment(
  cardId: string,
  body: { author: string; content: string; comment_type?: string; is_pivot?: boolean; pivot_impact?: string }
): Promise<{ data: NexusComment; cached: boolean }> {
  const res = await fetch(`/api/nexus/cards/${cardId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
  return res.json()
}

export async function resolveComment(
  cardId: string,
  commentId: string
): Promise<{ data: NexusComment; cached: boolean }> {
  const res = await fetch(`/api/nexus/cards/${cardId}/comments/${commentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolved: true }),
  })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
  return res.json()
}

export async function editComment(
  cardId: string,
  commentId: string,
  body: { content: string; comment_type?: string }
): Promise<{ data: NexusComment; cached: boolean }> {
  const res = await fetch(`/api/nexus/cards/${cardId}/comments/${commentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
  return res.json()
}

export async function deleteComment(
  cardId: string,
  commentId: string
): Promise<void> {
  const res = await fetch(`/api/nexus/cards/${cardId}/comments/${commentId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
}

export async function getUnresolvedComments(projectId?: string): Promise<{
  data: CardCommentSummary[]
  cached: boolean
}> {
  const url = projectId
    ? `/api/nexus/comments/unresolved?project_id=${projectId}`
    : '/api/nexus/comments/unresolved'
  return fetchApi<CardCommentSummary[]>(url)
}

// Release Queue
export async function getReleaseQueue(
  filter: 'flagged' | 'unflagged' | 'all' = 'flagged'
): Promise<{
  data: ReleaseQueueResponse
  cached: boolean
}> {
  return fetchApi<ReleaseQueueResponse>(`/api/nexus/release-queue?filter=${filter}`)
}

// Projects
export async function getProjects(): Promise<{
  data: Project[]
  cached: boolean
}> {
  return fetchApi<Project[]>('/api/projects')
}

export async function getProject(id: string): Promise<{
  data: ProjectDetail
  cached: boolean
}> {
  return fetchApi<ProjectDetail>(`/api/projects/${id}`)
}

export async function getProjectDashboard(slugOrId: string): Promise<{
  data: ProjectDashboardData
  cached: boolean
}> {
  return fetchApi<ProjectDashboardData>(`/api/projects/${slugOrId}/dashboard`)
}

export async function updateProjectNotes(
  slugOrId: string,
  notes: Partial<ProjectNotes>
): Promise<{ data: ProjectNotes; cached: boolean }> {
  const res = await fetch(`/api/projects/${slugOrId}/notes`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notes),
  })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
  return res.json()
}

export async function updateProjectLinks(
  slugOrId: string,
  items: ProjectLink[]
): Promise<{ data: ProjectLink[]; cached: boolean }> {
  const res = await fetch(`/api/projects/${slugOrId}/links`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
  return res.json()
}

// Inbox
export async function getInbox(
  filter?: InboxFilter
): Promise<{
  data: InboxItem[]
  cached: boolean
}> {
  let url = '/api/inbox'
  if (filter) {
    const params = new URLSearchParams()
    if (filter.project_id) params.append('project_id', filter.project_id)
    if (filter.status) params.append('status', filter.status)
    if (filter.type) params.append('type', filter.type)
    if (filter.priority) params.append('priority', filter.priority)
    const queryString = params.toString()
    if (queryString) url += `?${queryString}`
  }
  return fetchApi<InboxItem[]>(url)
}

export async function getInboxItem(id: string): Promise<{
  data: InboxItem
  cached: boolean
}> {
  return fetchApi<InboxItem>(`/api/inbox/${id}`)
}

export async function postInbox(
  item: InboxCreateRequest
): Promise<{ data: InboxItem; cached: boolean }> {
  const res = await fetch('/api/inbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
  return res.json()
}

export async function updateInboxItem(
  filename: string,
  updates: InboxUpdateRequest
): Promise<{ data: InboxItem; cached: boolean }> {
  const res = await fetch(`/api/inbox/${filename}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
  return res.json()
}

export async function linkInboxToCard(
  filename: string,
  cardId: string
): Promise<{ data: InboxItem; cached: boolean }> {
  return updateInboxItem(filename, { linked_card_id: cardId })
}


export async function deleteInboxItem(filename: string): Promise<void> {
  const res = await fetch(`/api/inbox/${filename}`, { method: 'DELETE' })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
}

// Card Search
export interface CardSearchResult {
  cardId: string
  title: string
  lane: string
  projectId: string
}

export async function searchCards(
  query: string,
  limit = 10
): Promise<{ data: CardSearchResult[]; cached: boolean }> {
  return fetchApi<CardSearchResult[]>(`/api/nexus/cards/search?q=${encodeURIComponent(query)}&limit=${limit}`)
}

// Canvas / Whiteboard
export async function getCanvases(): Promise<{
  data: CanvasSummary[]
  cached: boolean
}> {
  return fetchApi<CanvasSummary[]>('/api/canvas')
}

export async function getCanvas(id: string): Promise<{
  data: Canvas
  cached: boolean
}> {
  return fetchApi<Canvas>(`/api/canvas/${id}`)
}

export async function createCanvas(
  input: CreateCanvasInput = {}
): Promise<{ data: Canvas; cached: boolean }> {
  const res = await fetch('/api/canvas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
  return res.json()
}

export async function updateCanvas(
  id: string,
  input: UpdateCanvasInput
): Promise<{ data: Canvas; cached: boolean }> {
  const res = await fetch(`/api/canvas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
  return res.json()
}

export async function deleteCanvas(id: string): Promise<void> {
  const res = await fetch(`/api/canvas/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
}

// ── Release Pipeline ────────────────────────────────────

export interface ReleaseRunResponse {
  run_id: string
  dispatched_cards: string[]
  skipped_cards: string[]
  invalid_cards: string[]
}

export interface ReleaseRunStatus {
  id: string
  status: 'pending' | 'dispatched' | 'in_progress' | 'completed' | 'partial_failure' | 'failed'
  card_ids: string[]
  github_run_id: number | null
  results: Array<{
    card_id: string
    status: string
    error?: string
    merge_sha?: string
    branch_deleted?: boolean
  }>
  summary: string | null
  started_at: string
  completed_at: string | null
}

export async function triggerRelease(
  cardIds: string[],
  scheduledAt?: string
): Promise<{ data: ReleaseRunResponse; cached: boolean }> {
  const res = await fetch('/api/nexus/release-queue/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card_ids: cardIds, scheduled_at: scheduledAt }),
  })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
  return res.json()
}

export async function getReleaseRunStatus(
  runId: string
): Promise<{ data: ReleaseRunStatus; cached: boolean }> {
  return fetchApi<ReleaseRunStatus>(`/api/nexus/release-queue/trigger?run_id=${runId}`)
}

// ── Tech Stack ─────────────────────────────────────

export async function getTechStack(
  projectSlug: string
): Promise<{ data: TechStackItem[]; cached: boolean }> {
  return fetchApi<TechStackItem[]>(`/api/projects/${projectSlug}/tech-stack`)
}

export async function createTechStackItem(
  projectSlug: string,
  item: TechStackCreateRequest
): Promise<{ data: TechStackItem; cached: boolean }> {
  const res = await fetch(`/api/projects/${projectSlug}/tech-stack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
  return res.json()
}

export async function updateTechStackItem(
  projectSlug: string,
  itemId: string,
  updates: TechStackUpdateRequest
): Promise<{ data: TechStackItem; cached: boolean }> {
  const res = await fetch(`/api/projects/${projectSlug}/tech-stack/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
  return res.json()
}

export async function deleteTechStackItem(
  projectSlug: string,
  itemId: string
): Promise<void> {
  const res = await fetch(`/api/projects/${projectSlug}/tech-stack/${itemId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
}

// ── Project Workflows ──────────────────────────────

export async function getProjectWorkflows(
  projectSlug: string
): Promise<{ data: ProjectWorkflow[]; cached: boolean }> {
  return fetchApi<ProjectWorkflow[]>(`/api/projects/${projectSlug}/project-workflows`)
}

export async function createProjectWorkflow(
  projectSlug: string,
  workflow: WorkflowCreateRequest
): Promise<{ data: ProjectWorkflow; cached: boolean }> {
  const res = await fetch(`/api/projects/${projectSlug}/project-workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflow),
  })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
  return res.json()
}

export async function updateProjectWorkflow(
  projectSlug: string,
  workflowId: string,
  updates: WorkflowUpdateRequest
): Promise<{ data: ProjectWorkflow; cached: boolean }> {
  const res = await fetch(`/api/projects/${projectSlug}/project-workflows/${workflowId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
  return res.json()
}

export async function deleteProjectWorkflow(
  projectSlug: string,
  workflowId: string
): Promise<void> {
  const res = await fetch(`/api/projects/${projectSlug}/project-workflows/${workflowId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
}

// ── User Settings ──────────────────────────────────

export interface UserSetting {
  id: string
  key: string
  value: unknown
  category: string | null
  description: string | null
  createdAt: string
  updatedAt: string
}

export async function getSettings(): Promise<{
  data: UserSetting[]
  cached: boolean
}> {
  return fetchApi<UserSetting[]>('/api/user-settings')
}

export async function updateSetting(
  key: string,
  value: unknown
): Promise<{ data: UserSetting; cached: boolean }> {
  const res = await fetch('/api/user-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
  return res.json()
}
