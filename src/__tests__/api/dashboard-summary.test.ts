import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/dashboard/summary/route'

// Mock the database module
vi.mock('@/lib/server/database', () => ({
  tables: {
    nexus_projects: {
      select: vi.fn(),
    },
    nexus_cards: {
      select: vi.fn(),
    },
    skills: {
      select: vi.fn(),
    },
    workflows: {
      select: vi.fn(),
    },
    bender_platforms: {
      select: vi.fn(),
    },
    bender_tasks: {
      select: vi.fn(),
    },
  },
}))

async function setupMocks(overrides: Record<string, unknown> = {}) {
  const { tables } = await import('@/lib/server/database')

  vi.mocked(tables.nexus_projects.select).mockReturnValue({
    order: vi.fn().mockResolvedValue(overrides.projects ?? {
      data: [{ id: 'p1', slug: 'council', name: 'Council' }],
      error: null,
    }),
  } as never)

  vi.mocked(tables.nexus_cards.select).mockReturnValue(
    Promise.resolve(overrides.cards ?? {
      data: [
        { project_id: 'p1', lane: 'backlog', completed_at: null },
        { project_id: 'p1', lane: 'done', completed_at: '2026-02-16' },
      ],
      error: null,
    }) as never
  )

  vi.mocked(tables.skills.select).mockReturnValue(
    Promise.resolve(overrides.skills ?? { count: 5, error: null }) as never
  )

  vi.mocked(tables.workflows.select).mockReturnValue(
    Promise.resolve(overrides.workflows ?? { count: 3, error: null }) as never
  )

  vi.mocked(tables.bender_platforms.select).mockReturnValue(
    Promise.resolve(overrides.platforms ?? {
      data: [{ name: 'Claude', status: 'active' }],
      error: null,
    }) as never
  )

  vi.mocked(tables.bender_tasks.select).mockReturnValue(
    Promise.resolve(overrides.tasks ?? { data: [], error: null }) as never
  )
}

describe('GET /api/dashboard/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return complete dashboard summary shape', async () => {
    await setupMocks()

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data).toHaveProperty('boardStats')
    expect(body.data).toHaveProperty('activeBenders')
    expect(body.data).toHaveProperty('skillCount')
    expect(body.data).toHaveProperty('workflowCount')
    expect(Array.isArray(body.data.boardStats)).toBe(true)
    expect(Array.isArray(body.data.activeBenders)).toBe(true)
  })

  it('should compute lane stats correctly', async () => {
    await setupMocks()

    const response = await GET()
    const body = await response.json()
    const board = body.data.boardStats[0]

    expect(board.id).toBe('council')
    expect(board.totalOpen).toBe(1)
    expect(board.totalCompleted).toBe(1)
    expect(board.laneStats).toHaveLength(5)
  })

  it('should return 500 when projects query fails', async () => {
    await setupMocks({
      projects: { data: null, error: { message: 'timeout' } },
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error.code).toBe('FETCH_ERROR')
  })

  it('should handle null counts gracefully', async () => {
    await setupMocks({
      skills: { count: null, error: null },
      workflows: { count: null, error: null },
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.skillCount).toBe(0)
    expect(body.data.workflowCount).toBe(0)
  })

  it('should handle empty card list', async () => {
    await setupMocks({
      cards: { data: [], error: null },
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.boardStats[0].totalOpen).toBe(0)
    expect(body.data.boardStats[0].totalCompleted).toBe(0)
  })
})
