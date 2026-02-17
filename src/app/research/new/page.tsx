'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { SectionDivider } from '@/components/ui/section-divider'
import type {
  ResearchFrequency,
  ResearchRecipient,
  ResearchSubscriptionCreate,
} from '@/types/research'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const FREQUENCIES: ResearchFrequency[] = ['daily', 'weekly', 'biweekly', 'monthly']
const DATA_SOURCE_OPTIONS = [
  { value: 'web', label: 'Web Search' },
  { value: 'news', label: 'News' },
  { value: 'x_sentiment', label: 'X/Twitter Sentiment' },
]

// Input class shared across all text inputs / selects
const INPUT_CLS =
  'bg-terminal-bg-elevated border border-terminal-border rounded-sm px-2 py-1 font-mono text-[11px] text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent'

export default function NewResearchPage() {
  const router = useRouter()

  // Basic
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // Keywords
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')

  // Data sources (both checked by default)
  const [dataSources, setDataSources] = useState<string[]>(['web', 'news'])

  // Schedule
  const [frequency, setFrequency] = useState<ResearchFrequency>('weekly')
  const [scheduleDay, setScheduleDay] = useState(5) // 1=Mon..7=Sun, default Friday
  const [scheduleHour, setScheduleHour] = useState(14)

  // Recipients
  const [recipients, setRecipients] = useState<ResearchRecipient[]>([{ name: '', email: '' }])

  // Form state
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // --- Submit ---

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError(null)

    const payload: ResearchSubscriptionCreate = {
      name: name.trim(),
      description: description.trim() || undefined,
      keywords,
      data_sources: dataSources,
      frequency,
      schedule_day: scheduleDay,
      schedule_hour: scheduleHour,
      recipients: recipients.filter((r) => r.email.trim()),
    }

    try {
      const res = await fetch('/api/research/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error ?? `Failed to create subscription (${res.status})`)
        return
      }
      const created = await res.json()
      const slug = created.slug ?? created.data?.slug
      if (slug) {
        router.push(`/research/${slug}`)
      } else {
        router.push('/research')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const showDaySelect = frequency === 'weekly' || frequency === 'biweekly'

  return (
    <div className="max-w-2xl space-y-6 p-4">
      <h1 className="font-mono text-[13px] font-semibold uppercase tracking-wider text-terminal-fg-primary">
        New Subscription
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="e.g. AI Market Intelligence"
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
                placeholder="What should this subscription track?"
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
            Type a keyword and press Enter to add it.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleKeywordKeyDown}
              placeholder="e.g. generative AI"
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
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="checkbox"
                  checked={dataSources.includes(opt.value)}
                  onChange={() => toggleDataSource(opt.value)}
                  className="accent-[var(--user-accent)]"
                />
                <span className="font-mono text-[11px] text-terminal-fg-primary">
                  {opt.label}
                </span>
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

        {/* Error + Submit */}
        {error && (
          <p className="font-mono text-[11px] text-status-error">{error}</p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-sm border border-user-accent bg-user-accent-muted px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-terminal-fg-primary hover:bg-user-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Subscription'}
          </button>
          <a
            href="/research"
            className="font-mono text-[11px] text-terminal-fg-tertiary hover:text-terminal-fg-secondary transition-colors uppercase tracking-wider"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
