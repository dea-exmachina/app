'use client'

import { useState, useEffect } from 'react'
import type { TaskTypeRoutingRow } from '@/app/api/routing/route'

const STAKES_ORDER = ['low', 'medium', 'high', 'critical'] as const
type StakesLevel = (typeof STAKES_ORDER)[number]

function formatTaskType(taskType: string): string {
  return taskType
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function StakesBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-terminal-fg-tertiary">—</span>

  const styles: Record<string, string> = {
    low: 'text-status-success border-status-success',
    medium: 'text-status-warning border-status-warning',
    high: 'text-[#f97316] border-[#f97316]',
    critical: 'text-status-error border-status-error animate-pulse',
  }

  const cls = styles[level] ?? 'text-terminal-fg-secondary border-terminal-border'

  return (
    <span
      className={`inline-block border px-1 py-0 font-mono text-[10px] uppercase tracking-wider ${cls}`}
    >
      {level}
    </span>
  )
}

function ModelLabel({ model }: { model: string | null }) {
  if (!model) return <span className="text-terminal-fg-tertiary">—</span>

  const isGemini = model.startsWith('gemini')
  const isClaude = model.startsWith('claude')

  const colorCls = isGemini
    ? 'text-[#4285f4]'
    : isClaude
      ? 'text-user-accent'
      : 'text-terminal-fg-secondary'

  return <span className={colorCls}>{model}</span>
}

function OverrideCell({
  overrideModel,
  overrideReason,
  overrideExpiresAt,
}: {
  overrideModel: string | null
  overrideReason: string | null
  overrideExpiresAt: string | null
}) {
  if (!overrideModel) {
    return <span className="text-terminal-fg-tertiary">—</span>
  }

  const expiry = overrideExpiresAt
    ? new Date(overrideExpiresAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <span className="text-status-warning">
      {overrideModel}
      {overrideReason && (
        <span className="text-terminal-fg-tertiary"> · {overrideReason}</span>
      )}
      {expiry && (
        <span className="text-terminal-fg-tertiary"> · exp {expiry}</span>
      )}
    </span>
  )
}

function groupByStakes(
  rows: TaskTypeRoutingRow[]
): Array<{ stakes: string; rows: TaskTypeRoutingRow[] }> {
  const groups: Record<string, TaskTypeRoutingRow[]> = {}

  for (const row of rows) {
    const key = row.stakes_level ?? 'unknown'
    if (!groups[key]) groups[key] = []
    groups[key].push(row)
  }

  const ordered: Array<{ stakes: string; rows: TaskTypeRoutingRow[] }> = []

  for (const level of STAKES_ORDER) {
    if (groups[level]) {
      ordered.push({ stakes: level, rows: groups[level] })
    }
  }

  // Append any unrecognized stakes levels at the end
  for (const key of Object.keys(groups)) {
    if (!(STAKES_ORDER as readonly string[]).includes(key)) {
      ordered.push({ stakes: key, rows: groups[key] })
    }
  }

  return ordered
}

export function RoutingDashboardWidget() {
  const [rows, setRows] = useState<TaskTypeRoutingRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/routing')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{ data: TaskTypeRoutingRow[] }>
      })
      .then(({ data }) => setRows(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="font-mono text-[11px] text-terminal-fg-tertiary">
        Loading routing rules...
      </div>
    )
  }

  if (error || !rows) {
    return (
      <div className="font-mono text-[11px] text-status-error">
        Failed to load routing rules: {error ?? 'Unknown error'}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="font-mono text-[11px] text-terminal-fg-tertiary">
        No routing rules configured
      </div>
    )
  }

  const groups = groupByStakes(rows)

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full font-mono text-[11px] border-collapse">
        <thead>
          <tr className="border-b border-terminal-border">
            <th className="text-left py-1 px-2 text-terminal-fg-tertiary font-normal w-32">
              Task Type
            </th>
            <th className="text-left py-1 px-2 text-terminal-fg-tertiary font-normal w-40">
              Default Model
            </th>
            <th className="text-left py-1 px-2 text-terminal-fg-tertiary font-normal w-24">
              Stakes
            </th>
            <th className="text-center py-1 px-2 text-terminal-fg-tertiary font-normal w-16">
              Gov
            </th>
            <th className="text-center py-1 px-2 text-terminal-fg-tertiary font-normal w-20">
              Auto-Switch
            </th>
            <th className="text-left py-1 px-2 text-terminal-fg-tertiary font-normal">
              Override
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map(({ stakes, rows: groupRows }) => (
            <>
              {groupRows.map((row, idx) => (
                <tr
                  key={row.task_type}
                  className={[
                    'border-b border-terminal-border/40 hover:bg-terminal-bg-elevated/30 transition-colors',
                    idx === 0 && stakes !== groups[0].stakes
                      ? 'border-t border-t-terminal-border'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <td className="py-1 px-2 text-terminal-fg-primary">
                    {formatTaskType(row.task_type)}
                  </td>
                  <td className="py-1 px-2">
                    <ModelLabel model={row.default_model} />
                  </td>
                  <td className="py-1 px-2">
                    <StakesBadge level={row.stakes_level} />
                  </td>
                  <td className="py-1 px-2 text-center">
                    {row.is_governance ? (
                      <span
                        className="text-status-warning"
                        title="Governance task — Claude only"
                      >
                        &#128274;
                      </span>
                    ) : (
                      <span className="text-terminal-fg-tertiary">—</span>
                    )}
                  </td>
                  <td className="py-1 px-2 text-center">
                    {row.auto_switch ? (
                      <span className="text-status-success">on</span>
                    ) : (
                      <span className="text-terminal-fg-tertiary">off</span>
                    )}
                  </td>
                  <td className="py-1 px-2">
                    <OverrideCell
                      overrideModel={row.override_model}
                      overrideReason={row.override_reason}
                      overrideExpiresAt={row.override_expires_at}
                    />
                  </td>
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
