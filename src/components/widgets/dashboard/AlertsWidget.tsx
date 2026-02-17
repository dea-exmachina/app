'use client'

import { useState, useEffect, useCallback } from 'react'
import { SectionDivider } from '@/components/ui/section-divider'
import type { Alert } from '@/types/alert'

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-status-error border-status-error/30',
  warning: 'text-status-warn border-status-warn/30',
  info: 'text-terminal-fg-tertiary border-terminal-border',
}

const SEVERITY_INDICATORS: Record<string, string> = {
  critical: '!!',
  warning: '!',
  info: 'i',
}

const SOURCE_COLORS: Record<string, string> = {
  vercel: 'text-blue-400',
  supabase: 'text-green-400',
  github: 'text-purple-400',
  resend: 'text-cyan-400',
  cloudflare: 'text-amber-400',
  hookify: 'text-pink-400',
  manual: 'text-terminal-fg-secondary',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function AlertsWidget() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'active' | 'all'>('active')

  const fetchAlerts = useCallback(() => {
    setLoading(true)
    const params = filter === 'active' ? '?status=new' : '?limit=50'
    fetch(`/api/alerts${params}`)
      .then((r) => r.json())
      .then((json) => setAlerts(json.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const handleAcknowledge = useCallback(async (id: string) => {
    try {
      await fetch(`/api/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'acknowledged' }),
      })
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'acknowledged' as const } : a))
      )
    } catch { /* silent */ }
  }, [])

  const handleResolve = useCallback(async (id: string) => {
    try {
      await fetch(`/api/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      })
      setAlerts((prev) => prev.filter((a) => a.id !== id))
    } catch { /* silent */ }
  }, [])

  const newCount = alerts.filter((a) => a.status === 'new').length
  const critCount = alerts.filter((a) => a.severity === 'critical' && a.status === 'new').length

  return (
    <div className="flex h-full flex-col gap-1">
      <div className="flex items-center gap-2">
        <SectionDivider
          label="Alerts"
          count={critCount > 0 ? `${critCount} critical` : `${newCount} new`}
        />
        <div className="flex gap-1 shrink-0">
          {(['active', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`font-mono text-[9px] px-1.5 py-0 rounded-sm border transition-colors ${
                filter === f
                  ? 'border-user-accent text-user-accent'
                  : 'border-terminal-border text-terminal-fg-tertiary hover:text-terminal-fg-secondary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="font-mono text-[11px] text-terminal-fg-tertiary p-2">Loading...</div>
      ) : alerts.length === 0 ? (
        <div className="py-4 text-center font-mono text-[11px] text-terminal-fg-tertiary">
          No alerts. Systems nominal.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto space-y-0">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="group flex items-center gap-2 py-1 px-1 font-mono text-[11px] hover:bg-terminal-bg-elevated/50 rounded-sm transition-colors"
            >
              {/* Severity */}
              <span className={`shrink-0 text-[9px] font-bold w-4 text-center border rounded px-0.5 ${SEVERITY_COLORS[alert.severity]}`}>
                {SEVERITY_INDICATORS[alert.severity]}
              </span>

              {/* Source */}
              <span className={`shrink-0 text-[9px] w-12 ${SOURCE_COLORS[alert.source] ?? 'text-terminal-fg-tertiary'}`}>
                {alert.source}
              </span>

              {/* Title */}
              <span className="text-terminal-fg-primary truncate flex-1">
                {alert.title}
              </span>

              {/* Linked card */}
              {alert.cardId && (
                <span className="text-[9px] px-1 bg-user-accent/20 text-user-accent border border-user-accent/30 rounded shrink-0">
                  {alert.cardId}
                </span>
              )}

              {/* Age */}
              <span className="text-terminal-fg-tertiary shrink-0 w-8 text-right">
                {timeAgo(alert.createdAt)}
              </span>

              {/* Actions */}
              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {alert.status === 'new' && (
                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    className="text-[9px] text-terminal-fg-tertiary hover:text-status-warn"
                    title="Acknowledge"
                  >
                    ack
                  </button>
                )}
                {alert.status !== 'resolved' && (
                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="text-[9px] text-terminal-fg-tertiary hover:text-status-ok"
                    title="Resolve"
                  >
                    ok
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
