'use client'

import { useEffect, useState } from 'react'
import { SectionDivider } from '@/components/ui/section-divider'
import { Badge } from '@/components/ui/badge'

// ── Types ──────────────────────────────────────────

interface PerformanceEntry {
  taskId: string
  score: number
  ewmaSnapshot: number
  level: string
  reviewedAt: string
}

interface BenderDetail {
  slug: string
  displayName: string
  benderName: string | null
  expertise: string[]
  platforms: string[]
  retiredAt: string | null
  performance: PerformanceEntry[]
  taskStats: {
    total: number
    avgScore: number
    latestEwma: number | null
  }
}

// ── Score colors ───────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-400'
  if (score >= 80) return 'text-blue-400'
  if (score >= 70) return 'text-amber-400'
  return 'text-red-400'
}

function levelColor(level: string): string {
  switch (level) {
    case 'exemplary': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    case 'solid': return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    case 'needs_work': return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    case 'rework': return 'bg-red-500/15 text-red-400 border-red-500/30'
    default: return ''
  }
}

// ── Sparkline chart (pure CSS/div) ─────────────────

function PerformanceChart({ entries }: { entries: PerformanceEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="font-mono text-[11px] text-terminal-fg-tertiary py-4 text-center">
        No performance data yet
      </div>
    )
  }

  const maxScore = 100
  const barWidth = Math.min(40, Math.floor(280 / entries.length))

  return (
    <div className="space-y-2">
      {/* Bar chart */}
      <div className="flex items-end gap-[2px] h-[80px]">
        {entries.map((entry, i) => {
          const height = Math.max(4, (entry.score / maxScore) * 80)
          return (
            <div
              key={i}
              className="group relative flex flex-col items-center"
              style={{ width: barWidth }}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 bg-terminal-bg-elevated border border-terminal-border rounded-sm px-2 py-1 whitespace-nowrap">
                <div className="font-mono text-[9px] text-terminal-fg-primary">{entry.taskId}</div>
                <div className={`font-mono text-[10px] font-semibold ${scoreColor(entry.score)}`}>
                  {entry.score}/100
                </div>
              </div>
              {/* Bar */}
              <div
                className={`w-full rounded-t-sm transition-all ${
                  entry.score >= 80 ? 'bg-emerald-500/60' :
                  entry.score >= 70 ? 'bg-amber-500/60' :
                  'bg-red-500/60'
                }`}
                style={{ height }}
              />
            </div>
          )
        })}
      </div>

      {/* EWMA trend line (text-based) */}
      <div className="flex items-center justify-between font-mono text-[9px] text-terminal-fg-tertiary">
        <span>EWMA: {entries.map(e => e.ewmaSnapshot.toFixed(0)).join(' → ')}</span>
      </div>
    </div>
  )
}

// ── Panel ──────────────────────────────────────────

interface BenderDetailPanelProps {
  slug: string
  onClose: () => void
}

export function BenderDetailPanel({ slug, onClose }: BenderDetailPanelProps) {
  const [data, setData] = useState<BenderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    fetch(`/api/benders/identities/${encodeURIComponent(slug)}`)
      .then(res => res.json())
      .then(json => {
        if (json.error) throw new Error(json.error.message)
        setData(json.data)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [slug])

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-terminal-bg-surface border-l border-terminal-border z-50 overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="font-mono text-[10px] text-terminal-fg-tertiary uppercase tracking-wider">
                Bender Identity
              </span>
              <h2 className="font-mono text-[14px] font-semibold text-terminal-fg-primary">
                {loading ? slug : data?.displayName ?? slug}
              </h2>
              {data?.benderName && data.benderName !== data.displayName && (
                <span className="font-mono text-[11px] text-terminal-fg-secondary">
                  aka {data.benderName}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="font-mono text-[12px] text-terminal-fg-tertiary hover:text-terminal-fg-primary transition-colors px-1"
            >
              x
            </button>
          </div>

          {loading ? (
            <div className="font-mono text-[11px] text-terminal-fg-tertiary py-4">
              Loading bender data...
            </div>
          ) : error ? (
            <div className="font-mono text-[11px] text-red-400 py-4">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-terminal-bg-elevated rounded-sm p-2 text-center">
                  <div className="font-mono text-[18px] font-bold text-terminal-fg-primary">
                    {data.taskStats.total}
                  </div>
                  <div className="font-mono text-[9px] text-terminal-fg-tertiary uppercase">Tasks</div>
                </div>
                <div className="bg-terminal-bg-elevated rounded-sm p-2 text-center">
                  <div className={`font-mono text-[18px] font-bold ${scoreColor(data.taskStats.avgScore)}`}>
                    {data.taskStats.avgScore || '—'}
                  </div>
                  <div className="font-mono text-[9px] text-terminal-fg-tertiary uppercase">Avg Score</div>
                </div>
                <div className="bg-terminal-bg-elevated rounded-sm p-2 text-center">
                  <div className={`font-mono text-[18px] font-bold ${
                    data.taskStats.latestEwma ? scoreColor(data.taskStats.latestEwma) : 'text-terminal-fg-tertiary'
                  }`}>
                    {data.taskStats.latestEwma?.toFixed(0) ?? '—'}
                  </div>
                  <div className="font-mono text-[9px] text-terminal-fg-tertiary uppercase">EWMA</div>
                </div>
              </div>

              {/* Expertise */}
              {data.expertise.length > 0 && (
                <div>
                  <SectionDivider label="Expertise" />
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {data.expertise.map(skill => (
                      <Badge key={skill} variant="terminal" className="font-mono text-[10px]">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Platforms */}
              <div>
                <SectionDivider label="Platforms" />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {data.platforms.map(p => (
                    <Badge key={p} variant="terminal" className="font-mono text-[10px]">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Performance chart */}
              <div>
                <SectionDivider label="Performance History" count={data.performance.length || undefined} />
                <div className="mt-2">
                  <PerformanceChart entries={data.performance} />
                </div>
              </div>

              {/* Performance table */}
              {data.performance.length > 0 && (
                <div className="mt-2">
                  <table className="w-full font-mono text-[10px]">
                    <thead>
                      <tr className="border-b border-terminal-border">
                        <th className="text-left py-1 text-terminal-fg-tertiary uppercase">Task</th>
                        <th className="text-right py-1 text-terminal-fg-tertiary uppercase">Score</th>
                        <th className="text-right py-1 text-terminal-fg-tertiary uppercase">EWMA</th>
                        <th className="text-right py-1 text-terminal-fg-tertiary uppercase">Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...data.performance].reverse().map((entry, i) => (
                        <tr key={i} className="border-b border-terminal-border/50">
                          <td className="py-1 text-user-accent">{entry.taskId}</td>
                          <td className={`py-1 text-right ${scoreColor(entry.score)}`}>{entry.score}</td>
                          <td className="py-1 text-right text-terminal-fg-secondary">{entry.ewmaSnapshot.toFixed(1)}</td>
                          <td className="py-1 text-right">
                            <Badge variant="terminal" className={`text-[9px] ${levelColor(entry.level)}`}>
                              {entry.level}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Retired status */}
              {data.retiredAt && (
                <div className="font-mono text-[11px] text-red-400 bg-red-500/10 border border-red-500/30 rounded-sm px-2 py-1.5">
                  Retired: {new Date(data.retiredAt).toLocaleDateString()}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}
