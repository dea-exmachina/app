'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Calendar as CalendarIcon } from 'lucide-react'
import { SectionDivider } from '@/components/ui/section-divider'
import type { CalendarEvent, CalendarSourceId } from '@/app/api/calendar/events/route'

// ── Source config ─────────────────────────────────────────────────────────────

interface SourceConfig {
  id: CalendarSourceId
  label: string
  available: boolean
  description: string
}

const SOURCES: SourceConfig[] = [
  { id: 'nexus-sprints', label: 'NEXUS Sprints', available: true, description: 'Sprint boundaries' },
  { id: 'google-calendar', label: 'Google Calendar', available: false, description: 'Phase 2 — OAuth' },
  { id: 'kerkoporta', label: 'Kerkoporta', available: true, description: 'Publish dates' },
  { id: 'job-search', label: 'Job Search', available: true, description: 'Follow-up milestones' },
]

// ── Color helpers ─────────────────────────────────────────────────────────────

function dotColor(color: string): string {
  switch (color) {
    case 'accent': return 'bg-user-accent'
    case 'ok':     return 'bg-status-ok'
    case 'warn':   return 'bg-status-warn'
    case 'error':  return 'bg-status-error'
    default:       return 'bg-terminal-fg-tertiary'
  }
}

function textColor(color: string): string {
  switch (color) {
    case 'accent': return 'text-user-accent'
    case 'ok':     return 'text-status-ok'
    case 'warn':   return 'text-status-warn'
    case 'error':  return 'text-status-error'
    default:       return 'text-terminal-fg-tertiary'
  }
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function isoToDate(iso: string): Date {
  // Parse YYYY-MM-DD as local date (avoid UTC offset issues)
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay() // 0=Sun
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ── Calendar grid cell ────────────────────────────────────────────────────────

function CalendarCell({
  date,
  events,
  isToday,
  isCurrentMonth,
  isSelected,
  onClick,
}: {
  date: Date
  events: CalendarEvent[]
  isToday: boolean
  isCurrentMonth: boolean
  isSelected: boolean
  onClick: () => void
}) {
  const dayNum = date.getDate()
  const hasEvents = events.length > 0

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col p-1.5 text-left transition-colors border-b border-r border-terminal-border min-h-[72px] ${
        isCurrentMonth
          ? 'bg-terminal-bg hover:bg-terminal-bg-elevated'
          : 'bg-terminal-bg-surface opacity-40'
      } ${isSelected ? 'ring-1 ring-inset ring-user-accent' : ''}`}
    >
      {/* Day number */}
      <span
        className={`font-mono text-[11px] font-semibold leading-none mb-1 ${
          isToday
            ? 'text-user-accent'
            : isCurrentMonth
            ? 'text-terminal-fg-primary'
            : 'text-terminal-fg-tertiary'
        }`}
      >
        {isToday ? (
          <span className="rounded-full w-5 h-5 inline-flex items-center justify-center bg-user-accent text-terminal-bg text-[10px]">
            {dayNum}
          </span>
        ) : (
          dayNum
        )}
      </span>

      {/* Events */}
      <div className="flex flex-col gap-px overflow-hidden">
        {events.slice(0, 3).map((ev) => (
          <span
            key={ev.id}
            className={`flex items-center gap-1 font-mono text-[9px] leading-tight truncate ${textColor(ev.color)}`}
          >
            <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${dotColor(ev.color)}`} />
            <span className="truncate">{ev.title}</span>
          </span>
        ))}
        {events.length > 3 && (
          <span className="font-mono text-[9px] text-terminal-fg-tertiary">
            +{events.length - 3} more
          </span>
        )}
      </div>

      {/* Overflow indicator */}
      {hasEvents && events.length === 0 && (
        <span className={`absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full ${dotColor(events[0].color)}`} />
      )}
    </button>
  )
}

// ── Day detail panel ──────────────────────────────────────────────────────────

function DayPanel({ date, events, onClose }: {
  date: Date
  events: CalendarEvent[]
  onClose: () => void
}) {
  const label = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="rounded-sm border border-terminal-border bg-terminal-bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[11px] font-semibold text-terminal-fg-primary">{label}</span>
        <button
          onClick={onClose}
          className="font-mono text-[10px] text-terminal-fg-tertiary hover:text-terminal-fg-primary"
        >
          ✕
        </button>
      </div>

      {events.length === 0 ? (
        <p className="font-mono text-[10px] text-terminal-fg-tertiary">No events</p>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => (
            <div key={ev.id} className="flex items-start gap-2">
              <span className={`mt-1 shrink-0 w-2 h-2 rounded-full ${dotColor(ev.color)}`} />
              <div>
                <p className={`font-mono text-[11px] font-semibold ${textColor(ev.color)}`}>
                  {ev.title}
                </p>
                <p className="font-mono text-[9px] text-terminal-fg-tertiary uppercase tracking-wider">
                  {ev.source}
                  {ev.time && ` · ${ev.time}`}
                </p>
                {ev.metadata?.goal != null && (
                  <p className="mt-0.5 font-mono text-[10px] text-terminal-fg-secondary line-clamp-2">
                    {String(ev.metadata.goal)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Source legend ─────────────────────────────────────────────────────────────

function SourceLegend({
  enabledSources,
  onToggle,
}: {
  enabledSources: Set<CalendarSourceId>
  onToggle: (id: CalendarSourceId) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {SOURCES.map((src) => {
        const active = enabledSources.has(src.id)
        return (
          <button
            key={src.id}
            onClick={() => src.available && onToggle(src.id)}
            disabled={!src.available}
            title={src.available ? src.description : `${src.description} — not connected`}
            className={`flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[10px] transition-colors ${
              !src.available
                ? 'border-terminal-border text-terminal-fg-tertiary opacity-40 cursor-not-allowed'
                : active
                ? 'border-terminal-border-strong text-terminal-fg-primary'
                : 'border-terminal-border text-terminal-fg-tertiary hover:text-terminal-fg-secondary'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                src.id === 'nexus-sprints' ? 'bg-user-accent' :
                src.id === 'kerkoporta' ? 'bg-status-ok' :
                src.id === 'job-search' ? 'bg-status-warn' :
                'bg-terminal-fg-tertiary'
              } ${!active ? 'opacity-30' : ''}`}
            />
            {src.label}
            {!src.available && <span className="text-[8px] opacity-60">(soon)</span>}
          </button>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [enabledSources, setEnabledSources] = useState<Set<CalendarSourceId>>(
    new Set(SOURCES.filter((s) => s.available).map((s) => s.id))
  )

  const fetchEvents = useCallback(() => {
    setLoading(true)
    const sources = Array.from(enabledSources).join(',')
    fetch(`/api/calendar/events?sources=${sources}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.events)) setEvents(data.events)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [enabledSources])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Group events by ISO date
  const eventsByDate = events.reduce<Record<string, CalendarEvent[]>>((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = []
    acc[ev.date].push(ev)
    return acc
  }, {})

  // Build calendar grid
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month) // 0=Sun

  // Prev month tail days to fill first row
  const prevMonthDays = getDaysInMonth(year, month === 0 ? 11 : month - 1)
  const leadingDays = firstDay // how many cells from prev month

  // Build cell list: {date, isCurrentMonth}
  type CellDay = { date: Date; isCurrentMonth: boolean }
  const cells: CellDay[] = []

  for (let i = leadingDays - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthDays - i)
    cells.push({ date: d, isCurrentMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true })
  }
  // Trailing days to fill last row
  const totalCells = Math.ceil(cells.length / 7) * 7
  let trailingDay = 1
  while (cells.length < totalCells) {
    cells.push({ date: new Date(year, month + 1, trailingDay++), isCurrentMonth: false })
  }

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelectedDate(null)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelectedDate(null)
  }

  const todayIso = toIso(today)
  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : []

  const toggleSource = (id: CalendarSourceId) => {
    setEnabledSources(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-terminal-fg-tertiary" />
          <h1 className="font-mono text-[13px] font-semibold uppercase tracking-wider text-terminal-fg-primary">
            Calendar
          </h1>
        </div>
        <button
          onClick={fetchEvents}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-sm border border-terminal-border px-2.5 py-1 font-mono text-[11px] text-terminal-fg-secondary hover:border-terminal-border-strong hover:text-terminal-fg-primary transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Source filters */}
      <SourceLegend enabledSources={enabledSources} onToggle={toggleSource} />

      {/* Month nav */}
      <div className="flex items-center gap-3">
        <button
          onClick={prevMonth}
          className="rounded-sm border border-terminal-border p-1 text-terminal-fg-secondary hover:border-terminal-border-strong hover:text-terminal-fg-primary transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="font-mono text-[12px] font-semibold text-terminal-fg-primary min-w-[140px] text-center">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="rounded-sm border border-terminal-border p-1 text-terminal-fg-secondary hover:border-terminal-border-strong hover:text-terminal-fg-primary transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }}
          className="ml-2 rounded-sm border border-terminal-border px-2 py-1 font-mono text-[10px] text-terminal-fg-tertiary hover:text-terminal-fg-secondary transition-colors"
        >
          Today
        </button>
      </div>

      <div className="flex gap-4">
        {/* Calendar grid */}
        <div className="flex-1 overflow-hidden rounded-sm border border-terminal-border">
          {/* Day header row */}
          <div className="grid grid-cols-7 border-b border-terminal-border">
            {DAY_LABELS.map((d) => (
              <div
                key={d}
                className="py-1.5 text-center font-mono text-[10px] uppercase tracking-widest text-terminal-fg-tertiary border-r border-terminal-border last:border-r-0"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7">
            {cells.map(({ date, isCurrentMonth }, i) => {
              const iso = toIso(date)
              const dayEvents = eventsByDate[iso] ?? []
              const isToday = iso === todayIso
              const isSelected = iso === selectedDate
              const isLastRow = i >= cells.length - 7
              const isLastCol = (i + 1) % 7 === 0

              return (
                <div
                  key={iso + i}
                  className={`${isLastRow ? 'border-b-0' : ''} ${isLastCol ? 'border-r-0' : ''}`}
                >
                  <CalendarCell
                    date={date}
                    events={dayEvents}
                    isToday={isToday}
                    isCurrentMonth={isCurrentMonth}
                    isSelected={isSelected}
                    onClick={() => setSelectedDate(iso === selectedDate ? null : iso)}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Day detail panel (visible when date selected) */}
        {selectedDate && (
          <div className="w-64 shrink-0">
            <DayPanel
              date={isoToDate(selectedDate)}
              events={selectedEvents}
              onClose={() => setSelectedDate(null)}
            />
          </div>
        )}
      </div>

      {/* Upcoming events list */}
      <div>
        <SectionDivider
          label="Upcoming"
          count={loading ? '…' : events.filter((e) => e.date >= todayIso).length}
        />
        {loading ? (
          <p className="mt-2 font-mono text-[11px] text-terminal-fg-tertiary">Loading events…</p>
        ) : events.filter((e) => e.date >= todayIso).length === 0 ? (
          <p className="mt-2 font-mono text-[11px] text-terminal-fg-tertiary">No upcoming events</p>
        ) : (
          <div className="mt-2 space-y-px">
            {events
              .filter((e) => e.date >= todayIso)
              .slice(0, 15)
              .map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 rounded-sm px-2 py-1.5 hover:bg-terminal-bg-surface transition-colors"
                >
                  <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${dotColor(ev.color)}`} />
                  <span className="font-mono text-[10px] text-terminal-fg-tertiary w-20 shrink-0">
                    {new Date(ev.date + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                  </span>
                  <span className={`font-mono text-[11px] truncate ${textColor(ev.color)}`}>
                    {ev.title}
                  </span>
                  <span className="ml-auto shrink-0 font-mono text-[9px] text-terminal-fg-tertiary uppercase tracking-wider">
                    {ev.source}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
