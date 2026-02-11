import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useBoard } from '@/hooks/useBoard'

// Mock the API client
vi.mock('@/lib/client/api', () => ({
  getBoard: vi.fn(),
}))

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(() => {
          // Don't call the callback - skip realtime for tests
        }),
      })),
    })),
    removeChannel: vi.fn(),
  })),
}))

describe('useBoard hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with loading state', async () => {
    const { getBoard } = vi.mocked(await import('@/lib/client/api'))
    getBoard.mockResolvedValue({
      data: {
        id: 'council',
        name: 'Council',
        filePath: '',
        handoff: null,
        lanes: [],
      },
      cached: false,
    })

    const { result } = renderHook(() => useBoard('council'))

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBe(null)
    expect(result.current.error).toBe(null)
  })

  it('should fetch board data on mount', async () => {
    const { getBoard } = vi.mocked(await import('@/lib/client/api'))
    const mockBoard = {
      id: 'council',
      name: 'Council',
      filePath: '',
      handoff: null,
      lanes: [
        { name: 'Backlog', cards: [] },
        { name: 'Ready', cards: [] },
      ],
    }

    getBoard.mockResolvedValue({ data: mockBoard, cached: false })

    const { result } = renderHook(() => useBoard('council'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(mockBoard)
    expect(result.current.error).toBe(null)
  })

  it('should handle fetch errors', async () => {
    const { getBoard } = vi.mocked(await import('@/lib/client/api'))
    getBoard.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useBoard('council'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toBe(null)
    expect(result.current.error).toBe('Network error')
  })
})
