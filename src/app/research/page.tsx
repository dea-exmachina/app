'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { SectionDivider } from '@/components/ui/section-divider'
import type {
  ResearchSubscription,
  ResearchReport,
  SubscriptionStatus,
  ReportStatus,
} from '@/types/research'

// --- Helpers ---

function statusBadge(status: SubscriptionStatus): string {
  switch (status) {
    case 'active':
      return 'text-status-ok border-status-ok/30'
    case 'paused':
      return 'text-status-warn border-status-warn/30'
    case 'archived':
      return 'text-terminal-fg-tertiary border-terminal-border'
  }
}

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

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// --- Sub-components ---

function SubscriptionCard({ sub }: { sub: ResearchSubscription }) {
  return (
    <Link
      href={`/research/${sub.slug}`}
      className="block rounded-sm border border-terminal-border bg-terminal-bg-surface p-4 hover:border-terminal-border-strong transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold text-terminal-fg-primary truncate">
          {sub.name}
        </span>
        <span
          className={`shrink-0 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${statusBadge(sub.status)}`}
        >
          {sub.status}
        </span>
      </div>

      {sub.description && (
        <p className="mt-1 font-mono text-[10px] text-terminal-fg-tertiary line-clamp-2">
          {sub.description}
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
        <div>
          <span className="font-mono text-[10px] text-terminal-fg-tertiary uppercase tracking-wider">
            Keywords
          </span>
          <p className="font-mono text-[11px] text-terminal-fg-secondary">
            {sub.keywords.length}
          </p>
        </div>
        <div>
          <span className="font-mono text-[10px] text-terminal-fg-tertiary uppercase tracking-wider">
            Frequency
          </span>
          <p className="font-mono text-[11px] text-terminal-fg-secondary capitalize">
            {sub.frequency}
          </p>
        </div>
        <div>
          <span className="font-mono text-[10px] text-terminal-fg-tertiary uppercase tracking-wider">
            Next Run
          </span>
          <p className="font-mono text-[11px] text-terminal-fg-secondary">
            {formatDate(sub.next_run_at)}
          </p>
        </div>
        <div>
          <span className="font-mono text-[10px] text-terminal-fg-tertiary uppercase tracking-wider">
            Last Report
          </span>
          <p className="font-mono text-[11px] text-terminal-fg-secondary">
            {formatDate(sub.last_run_at)}
          </p>
        </div>
      </div>
    </Link>
  )
}

// --- Page ---

export default function ResearchPage() {
  const [subscriptions, setSubscriptions] = useState<ResearchSubscription[]>([])
  const [reports, setReports] = useState<ResearchReport[]>([])
  const [loadingSubs, setLoadingSubs] = useState(true)
  const [loadingReports, setLoadingReports] = useState(true)

  useEffect(() => {
    fetch('/api/research/subscriptions')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSubscriptions(data)
        else if (Array.isArray(data?.data)) setSubscriptions(data.data)
      })
      .catch(() => {})
      .finally(() => setLoadingSubs(false))

    fetch('/api/research/reports?status=ready&limit=10')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setReports(data)
        else if (Array.isArray(data?.data)) setReports(data.data)
      })
      .catch(() => {})
      .finally(() => setLoadingReports(false))
  }, [])

  // Map subscription_id → subscription name for the reports table
  const subMap = new Map(subscriptions.map((s) => [s.id, s.name]))

  return (
    <div className="max-w-4xl space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-[13px] font-semibold uppercase tracking-wider text-terminal-fg-primary">
          Research
        </h1>
        <Link
          href="/research/new"
          className="flex items-center gap-1.5 rounded-sm border border-terminal-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-terminal-fg-secondary hover:border-terminal-border-strong hover:text-terminal-fg-primary transition-colors"
        >
          <Plus size={12} />
          New Subscription
        </Link>
      </div>

      {/* Subscriptions */}
      <div>
        <SectionDivider label="Subscriptions" count={subscriptions.length} />
        {loadingSubs ? (
          <p className="mt-3 font-mono text-[11px] text-terminal-fg-tertiary">Loading subscriptions...</p>
        ) : subscriptions.length === 0 ? (
          <div className="mt-3 rounded-sm border border-terminal-border bg-terminal-bg-surface p-6 text-center">
            <p className="font-mono text-[11px] text-terminal-fg-tertiary">
              No subscriptions yet.{' '}
              <Link href="/research/new" className="text-terminal-fg-secondary underline underline-offset-2 hover:text-terminal-fg-primary">
                Create one
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {subscriptions.map((sub) => (
              <SubscriptionCard key={sub.id} sub={sub} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Reports */}
      <div>
        <SectionDivider label="Recent Reports" count={reports.length} />
        {loadingReports ? (
          <p className="mt-3 font-mono text-[11px] text-terminal-fg-tertiary">Loading reports...</p>
        ) : reports.length === 0 ? (
          <p className="mt-3 font-mono text-[11px] text-terminal-fg-tertiary">No reports yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-terminal-border">
                  <th className="pb-1.5 text-left font-mono text-[10px] uppercase tracking-wider text-terminal-fg-tertiary">
                    Title
                  </th>
                  <th className="pb-1.5 text-left font-mono text-[10px] uppercase tracking-wider text-terminal-fg-tertiary">
                    Subscription
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
                    <td className="py-2 pr-4 font-mono text-[11px] text-terminal-fg-secondary">
                      {subMap.get(report.subscription_id) ?? '—'}
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
    </div>
  )
}
