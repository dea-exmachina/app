import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/benders/teams/route'

// Mock the database module
vi.mock('@/lib/server/database', () => ({
  tables: {
    bender_teams: {
      select: vi.fn(),
    },
    bender_team_members: {
      select: vi.fn(),
    },
    bender_identities: {
      select: vi.fn(),
    },
  },
}))

describe('GET /api/benders/teams', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return teams with proper structure', async () => {
    const { tables } = await import('@/lib/server/database')

    vi.mocked(tables.bender_teams.select).mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: [{ id: 't1', name: 'Alpha Team', sequencing: 'parallel', branch_strategy: 'card', members: [] }],
        error: null,
      }),
    } as never)

    vi.mocked(tables.bender_team_members.select).mockReturnValue(
      Promise.resolve({ data: [], error: null }) as never
    )

    vi.mocked(tables.bender_identities.select).mockReturnValue(
      Promise.resolve({ data: [], error: null }) as never
    )

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data[0]).toHaveProperty('name', 'Alpha Team')
    expect(body.data[0]).toHaveProperty('members')
  })

  it('should return empty array when no teams exist', async () => {
    const { tables } = await import('@/lib/server/database')

    vi.mocked(tables.bender_teams.select).mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as never)

    vi.mocked(tables.bender_team_members.select).mockReturnValue(
      Promise.resolve({ data: [], error: null }) as never
    )

    vi.mocked(tables.bender_identities.select).mockReturnValue(
      Promise.resolve({ data: [], error: null }) as never
    )

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data).toEqual([])
  })

  it('should return 500 when database query fails', async () => {
    const { tables } = await import('@/lib/server/database')

    vi.mocked(tables.bender_teams.select).mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Connection refused' },
      }),
    } as never)

    vi.mocked(tables.bender_team_members.select).mockReturnValue(
      Promise.resolve({ data: [], error: null }) as never
    )

    vi.mocked(tables.bender_identities.select).mockReturnValue(
      Promise.resolve({ data: [], error: null }) as never
    )

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error.code).toBe('FETCH_ERROR')
  })

  it('should fall back to legacy JSONB members when junction table is empty', async () => {
    const { tables } = await import('@/lib/server/database')

    vi.mocked(tables.bender_teams.select).mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: [{
          id: 't1',
          name: 'Legacy Team',
          sequencing: '',
          branch_strategy: '',
          members: [{ name: 'bot-1', role: 'frontend' }],
          file_ownership: {},
        }],
        error: null,
      }),
    } as never)

    vi.mocked(tables.bender_team_members.select).mockReturnValue(
      Promise.resolve({ data: [], error: null }) as never
    )

    vi.mocked(tables.bender_identities.select).mockReturnValue(
      Promise.resolve({ data: [], error: null }) as never
    )

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data[0].members).toHaveLength(1)
    expect(body.data[0].members[0].name).toBe('bot-1')
  })
})
