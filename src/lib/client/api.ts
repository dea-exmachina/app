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
import type { ProjectLegacy as Project, ProjectDetail } from '@/types/project'
import type { InboxItem, InboxCreateRequest } from '@/types/inbox'
import type { Canvas, CanvasSummary, CreateCanvasInput, UpdateCanvasInput } from '@/types/canvas'
import type { NexusCard, NexusComment, NexusEvent, CardCommentSummary, ReleaseQueueResponse } from '@/types/nexus'

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
    if (filter.start) params.set('created_after', filter.start.toISOString())
    if (filter.end) params.set('created_before', filter.end.toISOString())
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

// Inbox
export async function getInbox(): Promise<{
  data: InboxItem[]
  cached: boolean
}> {
  return fetchApi<InboxItem[]>('/api/inbox')
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

export async function deleteInboxItem(filename: string): Promise<void> {
  const res = await fetch(`/api/inbox/${filename}`, { method: 'DELETE' })
  if (!res.ok) {
    const error: ApiError = await res.json()
    throw new Error(error.error.message)
  }
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
  cardIds: string[]
): Promise<{ data: ReleaseRunResponse; cached: boolean }> {
  const res = await fetch('/api/nexus/release-queue/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card_ids: cardIds }),
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
