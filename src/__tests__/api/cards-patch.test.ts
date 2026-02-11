import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/nexus/cards/[cardId]/route'

// Mock the database module
vi.mock('@/lib/server/database', () => ({
  db: {
    rpc: vi.fn(),
  },
  tables: {
    nexus_cards: {},
  },
}))

describe('PATCH /api/nexus/cards/[cardId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 VALIDATION_ERROR when body is empty', async () => {
    const request = new NextRequest('http://localhost/api/nexus/cards/DEA-042', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const params = Promise.resolve({ cardId: 'DEA-042' })
    const response = await PATCH(request, { params })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'No fields to update',
    })
  })

  it('should return proper error structure on validation failure', async () => {
    const request = new NextRequest('http://localhost/api/nexus/cards/DEA-042', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const params = Promise.resolve({ cardId: 'DEA-042' })
    const response = await PATCH(request, { params })
    const body = await response.json()

    // Verify error structure
    expect(body).toHaveProperty('error')
    expect(body.error).toHaveProperty('code')
    expect(body.error).toHaveProperty('message')
    expect(typeof body.error.code).toBe('string')
    expect(typeof body.error.message).toBe('string')
  })
})
