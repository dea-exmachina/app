'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Pause, Trash2, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { SectionDivider } from '@/components/ui/section-divider'
import type {
  ResearchSubscription,
  ResearchReport,
  ResearchFrequency,
  ResearchRecipient,
  ResearchSubscriptionUpdate,
  ReportStatus,
} from '@/types/research'

// --- Constants ---

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const FREQUENCIES: ResearchFrequency[] = ['daily', 'weekly', 'biweekly', 'monthly']
const DATA_SOURCE_OPTIONS = [
  { value: 'web', label: 'Web Search' },
  { value: 'news', label: 'News' },
  { value: 'x_sentiment', label: 'X/Twitter Sentiment' },
]

// --- Helpers ---

const INPUT_CLS =
  'bg-terminal-bg-elevated border border-terminal-border rounded-sm px-2 py-1 font-mono text-[11px] text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent'

function reportStatusBadge(status: ReportStatus): string {
  switch (status) {
    case 'ready':
      return 'text-status-ok border-status-ok/30'
    case 'generating':
      return 'text-status-warn border-status-warn/30'
    case 'failed':
      return 'text-status-error border-status-error/30'
    case 'archived':
      return 'text-terminal-fg-tertiary border-terminal-border'
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// --- Page ---

export default function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const router = useRouter()

  // Subscription data
  const [sub, setSub] = useState<ResearchSubscription | null>(null)
  const [reports, setReports] = useState<ResearchReport[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Edit form state — mirrors ResearchSubscription fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [dataSources, setDataSources] = useState<string[]>([])
  const [frequency, setFrequency] = useState<ResearchFrequency>('weekly')
  const [scheduleDay, setScheduleDay] = useState(0)
  const [scheduleHour, setScheduleHour] = useState(8)
  const [referenceDate, setReferenceDate] = useState<string>('')
  const [recipients, setRecipients] = useState<ResearchRecipient[]>([])

  // Save / action state
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [running, setRunning] = useState(false)
  const [runMessage, setRunMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Seed form from subscription
  function seedForm(s: ResearchSubscription) {
    setName(s.name)
    setDescription(s.description ?? '')
    setKeywords(s.keywords ?? [])
    setDataSources(s.data_sources ?? [])
    setFrequency(s.frequency)
    setScheduleDay(s.schedule_day ?? 0)
    setScheduleHour(s.schedule_hour ?? 8)
    setReferenceDate(s.reference_date ?? '')
    setRecipients(s.recipients?.length ? s.recipients : [{ name: '', email: '' }])
  }

  const fetchData = useCallback(() => {
    if (!slug) return

    setLoading(true)

    // Fetch all subscriptions and filter by slug client-side (API may not support slug query)
    fetch('/api/research/subscriptions')
      .then((r) => r.json())
      .then((data) => {
        const list: ResearchSubscription[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : []
        const found = list.find((s) => s.slug === slug)
        if (!found) {
          setNotFound(true)
          return
        }
        setSub(found)
        seedForm(found)

        // Fetch reports for this subscription
        return fetch(`/api/research/reports?subscription_id=${found.id}`)
          .then((r) => r.json())
          .then((rdata) => {
            const rlist: ResearchReport[] = Array.isArray(rdata)
              ? rdata
              : Array.isArray(rdata?.data)
                ? rdata.data
                : []
            setReports(rlist)
          })
          .catch(() => {})
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // --- Keyword handlers ---

  function addKeyword() {
    const kw = keywordInput.trim()
    if (kw && !keywords.includes(kw)) {
      setKeywords((prev) => [...prev, kw])
    }
    setKeywordInput('')
  }

  function removeKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw))
  }

  function handleKeywordKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addKeyword()
    }
  }

  // --- Data source handlers ---

  function toggleDataSource(value: string) {
    setDataSources((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    )
  }

  // --- Recipient handlers ---

  function updateRecipient(index: number, field: keyof ResearchRecipient, value: string) {
    setRecipients((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  function addRecipient() {
    setRecipients((prev) => [...prev, { name: '', email: '' }])
  }

  function removeRecipient(index: number) {
    setRecipients((prev) => prev.filter((_, i) => i !== index))
  }

  // --- Save ---

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!sub) return
    setSaving(true)
    setSaveMessage(null)

    const payload: ResearchSubscriptionUpdate = {
      name: name.trim(),
      description: description.trim() || undefined,
      keywords,
      data_sources: dataSources,
      frequency,
      schedule_day: scheduleDay,
      schedule_hour: scheduleHour,
      reference_date: referenceDate || null,
      recipients: recipients.filter((r) => r.email.trim()),
    }

    try {
      const res = await fetch(`/api/research/subscriptions/${sub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setSaveMessage({ type: 'ok', text: 'Saved.' })
        setTimeout(() => setSaveMessage(null), 2500)
      } else {
        const err = await res.json().catch(() => ({}))
        setSaveMessage({ type: 'error', text: err.error ?? `Error ${res.status}` })
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Network error.' })
    } finally {
      setSaving(false)
    }
  }

  // --- Run now ---

  async function handleRunNow() {
    if (!sub) return
    setRunning(true)
    setRunMessage(null)

    try {
      const res = await fetch('/api/research/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_id: sub.id }),
      })
      if (res.ok) {
        setRunMessage({ type: 'ok', text: 'Run triggered. Report generating...' })
        setTimeout(() => setRunMessage(null), 4000)
      } else {
        const err = await res.json().catch(() => ({}))
        setRunMessage({ type: 'error', text: err.error ?? `Error ${res.status}` })
      }
    } catch {
      setRunMessage({ type: 'error', text: 'Network error.' })
    } finally {
      setRunning(false)
    }
  }

  // --- Toggle pause/resume ---

  async function handleToggle() {
    if (!sub || toggling) return
    const next = sub.status === 'active' ? 'paused' : 'active'
    setToggling(true)
    try {
      const res = await fetch(`/api/research/subscriptions/${sub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (res.ok) {
        setSub((prev) => (prev ? { ...prev, status: next } : prev))
        setSaveMessage({ type: 'ok', text: next === 'paused' ? 'Subscription paused.' : 'Subscription resumed.' })
        setTimeout(() => setSaveMessage(null), 2500)
      } else {
        const err = await res.json().catch(() => ({}))
        setSaveMessage({ type: 'error', text: err.error ?? `Toggle failed (${res.status})` })
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Network error.' })
    } finally {
      setToggling(false)
    }
  }

  // --- Delete ---

  async function handleDelete() {
    if (!sub || !confirmDelete) return
    setDeleting(true)

    try {
      const res = await fetch(`/api/research/subscriptions/${sub.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.push('/research')
      } else {
        const err = await res.json().catch(() => ({}))
        setSaveMessage({ type: 'error', text: err.error ?? `Delete failed (${res.status})` })
        setConfirmDelete(false)
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Delete failed. Network error.' })
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  // --- Render states ---

  if (loading) {
    return (
      <div className="p-4">
        <p className="font-mono text-[11px] text-terminal-fg-tertiary">Loading...</p>
      </div>
    )
  }

  if (notFound || !sub) {
    return (
      <div className="p-4 space-y-2">
        <p className="font-mono text-[11px] text-terminal-fg-tertiary">Subscription not found.</p>
        <Link href="/research" className="font-mono text-[11px] text-terminal-fg-secondary hover:text-terminal-fg-primary underline underline-offset-2">
          Back to Research
        </Link>
      </div>
    )
  }

  const showDaySelect = frequency === 'weekly' || frequency === 'biweekly'

  return (
    <div className="max-w-2xl space-y-6 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/research"
            className="font-mono text-[10px] text-terminal-fg-tertiary hover:text-terminal-fg-secondary uppercase tracking-wider transition-colors"
          >
            Research /
          </Link>
          <h1 className="mt-0.5 font-mono text-[13px] font-semibold uppercase tracking-wider text-terminal-fg-primary">
            {sub.name}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {runMessage && (
            <span
              className={`font-mono text-[10px] ${runMessage.type === 'ok' ? 'text-status-ok' : 'text-status-error'}`}
            >
              {runMessage.text}
            </span>
          )}
          {sub.status !== 'archived' && (
            <button
              type="button"
              onClick={handleToggle}
              disabled={toggling}
              className="flex items-center gap-1.5 rounded-sm border border-terminal-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-terminal-fg-secondary hover:border-terminal-border-strong hover:text-terminal-fg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sub.status === 'active' ? <Pause size={11} /> : <Play size={11} />}
              {toggling ? '...' : sub.status === 'active' ? 'Pause' : 'Resume'}
            </button>
          )}
          <button
            type="button"
            onClick={handleRunNow}
            disabled={running}
            className="flex items-center gap-1.5 rounded-sm border border-terminal-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-terminal-fg-secondary hover:border-terminal-border-strong hover:text-terminal-fg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={11} />
            {running ? 'Running...' : 'Run Now'}
          </button>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic */}
        <div>
          <SectionDivider label="Basic" />
          <div className="mt-3 space-y-3">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-terminal-fg-tertiary">
                Name <span className="text-status-error">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={INPUT_CLS}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-terminal-fg-tertiary">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={`${INPUT_CLS} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Keywords */}
        <div>
          <SectionDivider label="Keywords" />
          <p className="mt-1 font-mono text-[10px] text-terminal-fg-tertiary">
            Press Enter to add a keyword.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleKeywordKeyDown}
              placeholder="Add keyword..."
              className={`${INPUT_CLS} flex-1`}
            />
            <button
              type="button"
              onClick={addKeyword}
              className="flex items-center gap-1 rounded-sm border border-terminal-border px-3 py-1 font-mono text-[11px] text-terminal-fg-secondary hover:border-terminal-border-strong hover:text-terminal-fg-primary transition-colors"
            >
              <Plus size={11} />
              Add
            </button>
          </div>
          {keywords.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="flex items-center gap-1 rounded-sm border border-terminal-border bg-terminal-bg-elevated px-2 py-0.5 font-mono text-[10px] text-terminal-fg-primary"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => removeKeyword(kw)}
                    className="text-terminal-fg-tertiary hover:text-status-error transition-colors"
                    aria-label={`Remove ${kw}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Data Sources */}
        <div>
          <SectionDivider label="Data Sources" />
          <div className="mt-3 space-y-2">
            {DATA_SOURCE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={dataSources.includes(opt.value)}
                  onChange={() => toggleDataSource(opt.value)}
                  className="accent-[var(--user-accent)]"
                />
                <span className="font-mono text-[11px] text-terminal-fg-primary">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div>
          <SectionDivider label="Schedule" />
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-terminal-fg-tertiary">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as ResearchFrequency)}
                className={INPUT_CLS}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {showDaySelect && (
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] uppercase tracking-wider text-terminal-fg-tertiary">
                  Day
                </label>
                <select
                  value={scheduleDay}
                  onChange={(e) => setScheduleDay(Number(e.target.value))}
                  className={INPUT_CLS}
                >
                  {DAYS.map((day, i) => (
                    <option key={day} value={i + 1}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-terminal-fg-tertiary">
                Hour (UTC)
              </label>
              <input
                type="number"
                min={0}
                max={23}
                value={scheduleHour}
                onChange={(e) => setScheduleHour(Number(e.target.value))}
                className={INPUT_CLS}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-terminal-fg-tertiary">
                Search From (optional)
              </label>
              <input
                type="date"
                value={referenceDate}
                onChange={(e) => setReferenceDate(e.target.value)}
                className={INPUT_CLS}
              />
              <p className="font-mono text-[9px] text-terminal-fg-tertiary mt-0.5">
                Limit results to this date and later
              </p>
            </div>
          </div>
        </div>

        {/* Recipients */}
        <div>
          <SectionDivider label="Recipients" />
          <div className="mt-3 space-y-2">
            {recipients.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={r.name}
                  onChange={(e) => updateRecipient(i, 'name', e.target.value)}
                  placeholder="Name"
                  className={`${INPUT_CLS} w-36`}
                />
                <input
                  type="email"
                  value={r.email}
                  onChange={(e) => updateRecipient(i, 'email', e.target.value)}
                  placeholder="email@example.com"
                  className={`${INPUT_CLS} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => removeRecipient(i)}
                  disabled={recipients.length === 1}
                  className="text-terminal-fg-tertiary hover:text-status-error transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Remove recipient"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addRecipient}
              className="flex items-center gap-1.5 font-mono text-[10px] text-terminal-fg-tertiary hover:text-terminal-fg-secondary transition-colors uppercase tracking-wider"
            >
              <Plus size={11} />
              Add recipient
            </button>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-sm border border-user-accent bg-user-accent-muted px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-terminal-fg-primary hover:bg-user-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saveMessage && (
            <span
              className={`font-mono text-[10px] ${saveMessage.type === 'ok' ? 'text-status-ok' : 'text-status-error'}`}
            >
              {saveMessage.text}
            </span>
          )}
        </div>
      </form>

      {/* Report History */}
      <div>
        <SectionDivider label="Report History" count={reports.length} />
        {reports.length === 0 ? (
          <p className="mt-3 font-mono text-[11px] text-terminal-fg-tertiary">
            No reports yet. Use &quot;Run Now&quot; to generate the first report.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-terminal-border">
                  <th className="pb-1.5 text-left font-mono text-[10px] uppercase tracking-wider text-terminal-fg-tertiary">
                    Title
                  </th>
                  <th className="pb-1.5 text-left font-mono text-[10px] uppercase tracking-wider text-terminal-fg-tertiary">
                    Date
                  </th>
                  <th className="pb-1.5 text-left font-mono text-[10px] uppercase tracking-wider text-terminal-fg-tertiary">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-terminal-border hover:bg-terminal-bg-surface transition-colors"
                  >
                    <td className="py-2 pr-4">
                      <Link
                        href={`/research/reports/${report.slug}`}
                        className="font-mono text-[11px] text-terminal-fg-primary hover:text-user-accent transition-colors"
                      >
                        {report.title}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 font-mono text-[11px] text-terminal-fg-secondary whitespace-nowrap">
                      {formatDate(report.report_date)}
                    </td>
                    <td className="py-2">
                      <span
                        className={`rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${reportStatusBadge(report.status)}`}
                      >
                        {report.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Danger Zone — Delete */}
      <div>
        <SectionDivider label="Danger Zone" />
        <div className="mt-3 flex items-center gap-3">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 rounded-sm border border-status-error/40 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-status-error hover:border-status-error hover:bg-status-error/10 transition-colors"
            >
              <Trash2 size={11} />
              Delete Subscription
            </button>
          ) : (
            <>
              <span className="font-mono text-[11px] text-status-error">
                Delete &quot;{sub.name}&quot; and all its reports? This cannot be undone.
              </span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-sm border border-status-error bg-status-error/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-status-error hover:bg-status-error/20 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="font-mono text-[11px] text-terminal-fg-tertiary hover:text-terminal-fg-secondary uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
