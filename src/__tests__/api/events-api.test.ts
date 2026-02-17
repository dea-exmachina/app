import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/nexus/events/route'

// Mock the database module
vi.mock('@/lib/server/database', () => ({
  tables: {
    audit_log: {
      select: vi.fn(),
    },
  },
}))

describe('GET /api/nexus/events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return events with pagination metadata', async () => {
    const { tables } = await import('@/lib/server/database')

    const mockData = [
      { id: '1', category: 'card', action: 'lane_changed', actor: 'dea', created_at: '2026-02-16' },
    ]

    // The route chains: select → order → range → (resolves)
    // No filter params = no .eq() calls
    vi.mocked(tables.audit_log.select).mockReturnValue({
      order: vi.fn(() => ({
        range: vi.fn().mockResolvedValue({ data: mockData, error: null, count: 1 }),
      })),
    } as never)

    const request = new NextRequest('http://localhost/api/nexus/events')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('total', 1)
    expect(body).toHaveProperty('limit', 50)
    expect(body).toHaveProperty('offset', 0)
    expect(body.has_more).toBe(false)
  })

  it('should return 500 on database error', async () => {
    const { tables } = await import('@/lib/server/database')

    vi.mocked(tables.audit_log.select).mockReturnValue({
      order: vi.fn(() => ({
        range: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB connection lost' }, count: null }),
      })),
    } as never)

    const request = new NextRequest('http://localhost/api/nexus/events')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error.code).toBe('FETCH_ERROR')
    expect(body.error.message).toBe('DB connection lost')
  })

  it('should respect limit parameter and cap at 1000', async () => {
    const { tables } = await import('@/lib/server/database')

    const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 })
    const orderMock = vi.fn(() => ({ range: rangeMock }))

    vi.mocked(tables.audit_log.select).mockReturnValue({
      order: orderMock,
    } as never)

    const request = new NextRequest('http://localhost/api/nexus/events?limit=5000')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.limit).toBe(1000)
  })
})
