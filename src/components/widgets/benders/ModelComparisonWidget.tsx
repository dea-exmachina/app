'use client'

import { useState, useEffect } from 'react'
import type { Database } from '@/types/supabase'

type ModelLibraryRow = Database['public']['Tables']['model_library']['Row']

function formatContextLength(length: number | null): string {
  if (length === null) return '—'
  if (length >= 1_000_000) return `${length / 1_000_000}M`
  if (length >= 1_000) return `${length / 1_000}K`
  return String(length)
}

function formatPrice(price: number | null): string {
  if (price === null) return '—'
  return `$${price.toFixed(2)}`
}

function formatLatency(ms: number | null): string {
  if (ms === null) return '—'
  return `${ms}ms`
}

function CostTierBar({ tier }: { tier: number }) {
  const max = 10
  const filled = Math.round((tier / max) * 5)
  return (
    <span className="inline-flex gap-px">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={
            i < filled
              ? 'text-user-accent'
              : 'text-terminal-fg-tertiary'
          }
        >
          █
        </span>
      ))}
      <span className="ml-1 text-terminal-fg-secondary">{tier}</span>
    </span>
  )
}

function ProviderBadge({ provider }: { provider: string }) {
  const colorClass =
    provider === 'google'
      ? 'text-status-info border-status-info'
      : provider === 'anthropic'
        ? 'border-status-warning text-status-warning'
        : 'text-terminal-fg-secondary border-terminal-border'

  return (
    <span
      className={`border px-1 py-px font-mono text-[10px] uppercase tracking-wide ${colorClass}`}
    >
      {provider}
    </span>
  )
}

interface EscalationChainProps {
  slug: string
  escalatesTo: string | null
  allModels: ModelLibraryRow[]
}

function EscalationChain({ slug, escalatesTo, allModels }: EscalationChainProps) {
  const chain: string[] = [slug]
  let current = escalatesTo
  const visited = new Set<string>([slug])

  while (current && !visited.has(current)) {
    chain.push(current)
    visited.add(current)
    const next = allModels.find((m) => m.slug === current)
    current = next?.escalates_to ?? null
  }

  if (chain.length === 1) {
    return <span className="text-terminal-fg-tertiary">—</span>
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {chain.map((s, i) => (
        <span key={s} className="inline-flex items-center gap-1">
          {i > 0 && (
            <span className="text-terminal-fg-tertiary">→</span>
          )}
          <span
            className={
              i === 0
                ? 'text-terminal-fg-primary'
                : 'text-terminal-fg-secondary'
            }
          >
            {s}
          </span>
        </span>
      ))}
    </span>
  )
}

export function ModelComparisonWidget() {
  const [models, setModels] = useState<ModelLibraryRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/models')
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json()
          throw new Error(body?.error?.message ?? 'Failed to fetch models')
        }
        return res.json()
      })
      .then((json) => setModels(json.data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="font-mono text-[11px] text-terminal-fg-tertiary">
        Loading model library...
      </div>
    )
  }

  if (error || !models) {
    return (
      <div className="font-mono text-[11px] text-status-error">
        Failed to load models: {error ?? 'Unknown error'}
      </div>
    )
  }

  return (
    <div className="overflow-auto font-mono text-[11px]">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-terminal-border text-terminal-fg-secondary">
            <th className="py-1 pr-3 text-left font-normal">Model</th>
            <th className="py-1 pr-3 text-left font-normal">Provider</th>
            <th className="py-1 pr-3 text-left font-normal">Tier</th>
            <th className="py-1 pr-3 text-right font-normal">In/Mtok</th>
            <th className="py-1 pr-3 text-right font-normal">Out/Mtok</th>
            <th className="py-1 pr-3 text-right font-normal">Latency</th>
            <th className="py-1 pr-3 text-right font-normal">Context</th>
            <th className="py-1 pr-3 text-left font-normal">Capabilities</th>
            <th className="py-1 pr-3 text-left font-normal">Escalation</th>
            <th className="py-1 text-center font-normal">Route</th>
          </tr>
        </thead>
        <tbody>
          {models.map((model, idx) => (
            <tr
              key={model.slug}
              className={
                idx % 2 === 0
                  ? 'bg-terminal-bg-surface'
                  : 'bg-transparent'
              }
            >
              <td className="py-1 pr-3 text-terminal-fg-primary">
                {model.display_name}
              </td>
              <td className="py-1 pr-3">
                <ProviderBadge provider={model.provider} />
              </td>
              <td className="py-1 pr-3">
                <CostTierBar tier={model.cost_tier} />
              </td>
              <td className="py-1 pr-3 text-right text-terminal-fg-primary">
                {formatPrice(model.input_price_per_mtok)}
              </td>
              <td className="py-1 pr-3 text-right text-terminal-fg-primary">
                {formatPrice(model.output_price_per_mtok)}
              </td>
              <td className="py-1 pr-3 text-right text-terminal-fg-secondary">
                {formatLatency(model.latency_p50_ms)}
              </td>
              <td className="py-1 pr-3 text-right text-terminal-fg-secondary">
                {formatContextLength(model.context_length)}
              </td>
              <td className="py-1 pr-3">
                <span className="inline-flex flex-wrap gap-1">
                  {(model.capabilities ?? []).map((cap) => (
                    <span
                      key={cap}
                      className="border border-terminal-border px-1 py-px text-[10px] text-terminal-fg-tertiary"
                    >
                      {cap}
                    </span>
                  ))}
                  {(model.capabilities ?? []).length === 0 && (
                    <span className="text-terminal-fg-tertiary">—</span>
                  )}
                </span>
              </td>
              <td className="py-1 pr-3">
                <EscalationChain
                  slug={model.slug}
                  escalatesTo={model.escalates_to}
                  allModels={models}
                />
              </td>
              <td className="py-1 text-center">
                {model.auto_route_eligible ? (
                  <span className="text-status-success">✓</span>
                ) : (
                  <span className="text-status-error">✗</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
