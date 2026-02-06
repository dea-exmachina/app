// Typed fetch wrappers for all API endpoints
// All return Promise<T> where T is the data type (unwrapped from ApiResponse)

import type { ApiResponse, ApiError, RateLimit } from '@/types/api'
import type { DashboardSummary } from '@/types/dashboard'
import type { KanbanBoard, BoardSummary, HandoffSection } from '@/types/kanban'
import type { Skill, SkillDetail } from '@/types/skill'
import type { Workflow } from '@/types/workflow'
import type { BenderPlatform, BenderTask, BenderTeam } from '@/types/bender'
import type { Project, ProjectDetail } from '@/types/project'
import type { InboxItem, InboxCreateRequest } from '@/types/inbox'

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

export async function getBoard(id: string): Promise<{
  data: KanbanBoard
  cached: boolean
}> {
  return fetchApi<KanbanBoard>(`/api/kanban/boards/${id}`)
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

export async function getRateLimit(): Promise<{
  data: RateLimit
  cached: boolean
}> {
  return fetchApi<RateLimit>('/api/github/rate-limit')
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
