import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/inbox/route'

// Mock the database module
vi.mock('@/lib/server/database', () => ({
  tables: {
    inbox_items: {
      select: vi.fn(),
      insert: vi.fn(),
    },
  },
}))

describe('GET /api/inbox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return inbox items sorted by created desc', async () => {
    const { tables } = await import('@/lib/server/database')

    const mockData = [
      { id: '1', filename: 'test.md', title: 'Test', type: 'note', status: 'pending', created: '2026-02-16', source: 'webapp', content: 'hello' },
    ]

    vi.mocked(tables.inbox_items.select).mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    } as never)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data[0]).toHaveProperty('filename', 'test.md')
    expect(body.data[0]).toHaveProperty('sha', '1') // ID mapped to sha
  })

  it('should return 500 on database error', async () => {
    const { tables } = await import('@/lib/server/database')

    vi.mocked(tables.inbox_items.select).mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB down' } }),
    } as never)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error.code).toBe('FETCH_ERROR')
  })

  it('should handle empty inbox', async () => {
    const { tables } = await import('@/lib/server/database')

    vi.mocked(tables.inbox_items.select).mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as never)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data).toEqual([])
  })
})

describe('POST /api/inbox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 when required fields are missing', async () => {
    const request = new NextRequest('http://localhost/api/inbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test' }), // missing content and type
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('should create inbox item with proper filename format', async () => {
    const { tables } = await import('@/lib/server/database')

    const mockRow = {
      id: '2',
      filename: '2026-02-16T10-00-00-test-item.md',
      title: 'Test Item',
      type: 'note',
      status: 'pending',
      created: '2026-02-16T10:00:00.000Z',
      source: 'webapp',
      content: 'Body text',
    }

    vi.mocked(tables.inbox_items.insert).mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: mockRow, error: null }),
      })),
    } as never)

    const request = new NextRequest('http://localhost/api/inbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Item', content: 'Body text', type: 'note' }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.title).toBe('Test Item')
    expect(body.data.status).toBe('pending')
    expect(body.data.source).toBe('webapp')
  })

  it('should return 500 on insert failure', async () => {
    const { tables } = await import('@/lib/server/database')

    vi.mocked(tables.inbox_items.insert).mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
      })),
    } as never)

    const request = new NextRequest('http://localhost/api/inbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', content: 'Body', type: 'note' }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error.code).toBe('WRITE_ERROR')
  })
})
