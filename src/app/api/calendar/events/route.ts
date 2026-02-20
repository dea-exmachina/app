import { NextResponse } from 'next/server'
import { db } from '@/lib/server/database'

export interface CalendarEvent {
  id: string
  title: string
  date: string       // ISO date YYYY-MM-DD
  endDate?: string   // ISO date for multi-day events
  time?: string      // HH:MM for timed events
  type: CalendarEventType
  source: CalendarSourceId
  /** Semantic color token: 'accent' | 'ok' | 'warn' | 'error' | 'muted' */
  color: string
  url?: string
  metadata?: Record<string, unknown>
}

export type CalendarEventType =
  | 'sprint-start'
  | 'sprint-end'
  | 'google-event'
  | 'publish'
  | 'job-milestone'

export type CalendarSourceId =
  | 'nexus-sprints'
  | 'google-calendar'
  | 'kerkoporta'
  | 'job-search'

// ── NEXUS Sprints source ─────────────────────────────────────────────────────

async function fetchSprintEvents(): Promise<CalendarEvent[]> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('nexus_sprints')
    .select('id, name, goal, status, start_date, end_date')
    .gte('end_date', cutoff)
    .order('start_date', { ascending: false })
    .limit(20)

  if (error || !Array.isArray(data)) return []

  const events: CalendarEvent[] = []
  for (const sprint of data as {
    id: string; name: string; goal: string | null
    status: string; start_date: string; end_date: string
  }[]) {
    const color = sprint.status === 'active' ? 'accent' : 'muted'
    events.push({
      id: `${sprint.id}-start`,
      title: `▶ ${sprint.name}`,
      date: sprint.start_date,
      endDate: sprint.end_date,
      type: 'sprint-start',
      source: 'nexus-sprints',
      color,
      metadata: { goal: sprint.goal, status: sprint.status },
    })
    events.push({
      id: `${sprint.id}-end`,
      title: `■ ${sprint.name} ends`,
      date: sprint.end_date,
      type: 'sprint-end',
      source: 'nexus-sprints',
      color,
      metadata: { goal: sprint.goal, status: sprint.status },
    })
  }
  return events
}

// ── Google Calendar (stub — OAuth phase 2) ───────────────────────────────────

async function fetchGoogleCalendarEvents(): Promise<CalendarEvent[]> {
  // TODO(CC-078-p2): Wire Google Calendar OAuth
  // Use Google Workspace MCP get_events or a server-side service account
  return []
}

// ── Kerkoporta publish dates ──────────────────────────────────────────────────

async function fetchKerkoportaEvents(): Promise<CalendarEvent[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('nexus_cards')
    .select('card_id, title, due_date, nexus_projects!inner(slug)')
    .eq('nexus_projects.slug', 'kerkoporta')
    .not('due_date', 'is', null)
    .neq('lane', 'done')
    .order('due_date', { ascending: true })
    .limit(20)

  if (error || !Array.isArray(data)) return []

  return (data as { card_id: string; title: string; due_date: string }[]).map((row) => ({
    id: `kerko-${row.card_id}`,
    title: `✍ ${row.title}`,
    date: row.due_date.substring(0, 10),
    type: 'publish' as CalendarEventType,
    source: 'kerkoporta' as CalendarSourceId,
    color: 'ok',
  }))
}

// ── Job search milestones ─────────────────────────────────────────────────────

async function fetchJobSearchEvents(): Promise<CalendarEvent[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('nexus_cards')
    .select('card_id, title, due_date, nexus_projects!inner(slug)')
    .eq('nexus_projects.slug', 'job-search')
    .not('due_date', 'is', null)
    .neq('lane', 'done')
    .order('due_date', { ascending: true })
    .limit(20)

  if (error || !Array.isArray(data)) return []

  return (data as { card_id: string; title: string; due_date: string }[]).map((row) => ({
    id: `job-${row.card_id}`,
    title: `💼 ${row.title}`,
    date: row.due_date.substring(0, 10),
    type: 'job-milestone' as CalendarEventType,
    source: 'job-search' as CalendarSourceId,
    color: 'warn',
  }))
}

// ── Route handler ─────────────────────────────────────────────────────────────

const FETCHERS: Record<CalendarSourceId, () => Promise<CalendarEvent[]>> = {
  'nexus-sprints': fetchSprintEvents,
  'google-calendar': fetchGoogleCalendarEvents,
  'kerkoporta': fetchKerkoportaEvents,
  'job-search': fetchJobSearchEvents,
}

const ALL_SOURCES: CalendarSourceId[] = [
  'nexus-sprints',
  'google-calendar',
  'kerkoporta',
  'job-search',
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sourcesParam = searchParams.get('sources')
  const enabledSources: CalendarSourceId[] = sourcesParam
    ? (sourcesParam.split(',') as CalendarSourceId[])
    : ALL_SOURCES

  const results = await Promise.allSettled(
    enabledSources.map((src) => (FETCHERS[src] ?? (() => Promise.resolve([])))())
  )

  const events: CalendarEvent[] = []
  const errors: Partial<Record<CalendarSourceId, string>> = {}

  results.forEach((result, i) => {
    const src = enabledSources[i]
    if (result.status === 'fulfilled') {
      events.push(...result.value)
    } else {
      errors[src] = String(result.reason)
    }
  })

  events.sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({
    events,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
    sources: enabledSources,
  })
}
