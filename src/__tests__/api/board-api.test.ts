import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/kanban/boards/[boardId]/route'

// Mock the database module
vi.mock('@/lib/server/database', () => ({
  tables: {
    nexus_projects: {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    },
    nexus_cards: {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(),
        })),
      })),
    },
  },
}))

describe('GET /api/kanban/boards/[boardId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return proper KanbanBoard shape with lanes array', async () => {
    const { tables } = await import('@/lib/server/database')

    // Mock successful project lookup
    const mockProject = { id: '1', slug: 'council', name: 'Council Board' }
    vi.mocked(tables.nexus_projects.select).mockReturnValue({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
      })),
    } as never)

    // Mock successful cards lookup (empty array)
    vi.mocked(tables.nexus_cards.select).mockReturnValue({
      eq: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    } as never)

    const request = new NextRequest('http://localhost/api/kanban/boards/council')
    const params = Promise.resolve({ boardId: 'council' })
    const response = await GET(request, { params })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveProperty('data')
    expect(body.data).toHaveProperty('id')
    expect(body.data).toHaveProperty('name')
    expect(body.data).toHaveProperty('lanes')
    expect(Array.isArray(body.data.lanes)).toBe(true)

    // Verify lanes have proper structure
    body.data.lanes.forEach((lane: unknown) => {
      expect(lane).toHaveProperty('name')
      expect(lane).toHaveProperty('cards')
      expect(Array.isArray((lane as { cards: unknown[] }).cards)).toBe(true)
    })
  })

  it('should return 404 for unknown board', async () => {
    const { tables } = await import('@/lib/server/database')

    // Mock project not found
    vi.mocked(tables.nexus_projects.select).mockReturnValue({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      })),
    } as never)

    const request = new NextRequest('http://localhost/api/kanban/boards/nonexistent')
    const params = Promise.resolve({ boardId: 'nonexistent' })
    const response = await GET(request, { params })
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toHaveProperty('error')
    expect(body.error.code).toBe('NOT_FOUND')
  })
})
