/**
 * Research Report Viewer
 *
 * Publicly accessible (middleware excludes /research/reports paths).
 * Server component — fetches report data server-side by slug.
 * Phase 1: Text-only, terminal aesthetic. Charts come in a later phase.
 */

import type React from 'react'
import { tables } from '@/lib/server/database'
import type { ResearchReport, ReportSection, ReportSource, ReportSentiment } from '@/types/research'

// ─── Rich finding type from Claude synthesis ─────────────────────────────────

interface RichFinding {
  finding: string
  significance: 'high' | 'medium' | 'low'
  sources?: string[]
}

type KeyFinding = string | RichFinding

function isRichFinding(f: KeyFinding): f is RichFinding {
  return typeof f === 'object' && f !== null && 'finding' in f
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return (
    d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }) +
    ' ' +
    d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
    })
  )
}

function formatGenerationTime(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Divider(): React.ReactElement {
  return <div className="border-t border-terminal-border my-8" />
}

function SectionHeading({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <h2 className="font-mono text-[14px] font-semibold uppercase tracking-wider text-terminal-fg-primary border-b border-terminal-border pb-2 mb-4">
      {children}
    </h2>
  )
}

function MetaTag({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement {
  return (
    <span className="font-mono text-[11px] text-terminal-fg-tertiary">
      <span className="uppercase tracking-wider">{label}:</span>{' '}
      <span>{value}</span>
    </span>
  )
}

function SignificanceBadge({
  significance,
}: {
  significance: 'high' | 'medium' | 'low'
}): React.ReactElement {
  const styles: Record<'high' | 'medium' | 'low', string> = {
    high: 'text-status-error border-status-error/30',
    medium: 'text-status-warn border-status-warn/30',
    low: 'text-status-ok border-status-ok/30',
  }
  return (
    <span
      className={`shrink-0 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${styles[significance]}`}
    >
      {significance}
    </span>
  )
}

function SentimentBadge({
  sentiment,
}: {
  sentiment: ReportSentiment['overall']
}): React.ReactElement {
  const styles: Record<ReportSentiment['overall'], string> = {
    positive: 'text-status-ok border-status-ok/30',
    negative: 'text-status-error border-status-error/30',
    neutral: 'text-terminal-fg-secondary border-terminal-border',
    mixed: 'text-status-warn border-status-warn/30',
  }
  return (
    <span
      className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${styles[sentiment]}`}
    >
      {sentiment}
    </span>
  )
}

function SourceList({ sources }: { sources: ReportSource[] }): React.ReactElement {
  return (
    <div className="mt-4 space-y-1">
      <p className="font-mono text-[11px] uppercase tracking-wider text-terminal-fg-tertiary mb-2">
        Sources
      </p>
      <ul className="space-y-1">
        {sources.map((src, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="font-mono text-[11px] text-terminal-fg-tertiary mt-[1px]">•</span>
            <span className="font-mono text-[11px] text-terminal-fg-secondary">
              {src.title}
              {src.url && (
                <>
                  {' — '}
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-user-accent hover:underline break-all"
                  >
                    {src.url}
                  </a>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ReportSectionBlock({
  section,
  index,
}: {
  section: ReportSection
  index: number
}): React.ReactElement {
  return (
    <section>
      <SectionHeading>
        {index + 1}. {section.title}
      </SectionHeading>

      {/* Content — rendered as paragraphs on double-newlines */}
      <div className="space-y-4">
        {section.content.split('\n\n').map((para, i) => (
          <p
            key={i}
            className="font-mono text-[12px] leading-relaxed text-terminal-fg-secondary whitespace-pre-wrap"
          >
            {para.trim()}
          </p>
        ))}
      </div>

      {/* Phase 2 chart placeholder */}
      {section.charts && section.charts.length > 0 && (
        <div className="mt-6 border border-dashed border-terminal-border rounded-sm px-4 py-3">
          <p className="font-mono text-[11px] text-terminal-fg-tertiary text-center uppercase tracking-wider">
            Charts — coming in Phase 2
          </p>
        </div>
      )}

      {section.sources && section.sources.length > 0 && (
        <SourceList sources={section.sources} />
      )}
    </section>
  )
}

// ─── Error / Loading States ───────────────────────────────────────────────────

function ReportNotFound(): React.ReactElement {
  return (
    <div className="min-h-screen bg-terminal-bg-base flex items-center justify-center">
      <div className="max-w-md text-center space-y-4 px-6">
        <p className="font-mono text-[11px] uppercase tracking-wider text-terminal-fg-tertiary">
          404
        </p>
        <h1 className="font-mono text-[20px] font-bold text-terminal-fg-primary">
          Report not found
        </h1>
        <p className="font-mono text-[12px] text-terminal-fg-secondary">
          The report you are looking for does not exist or has been archived.
        </p>
      </div>
    </div>
  )
}

function ReportGenerating(): React.ReactElement {
  return (
    <div className="min-h-screen bg-terminal-bg-base flex items-center justify-center">
      <div className="max-w-md text-center space-y-4 px-6">
        <p className="font-mono text-[11px] uppercase tracking-wider text-terminal-fg-tertiary">
          Status: Generating
        </p>
        <h1 className="font-mono text-[20px] font-bold text-terminal-fg-primary">
          Report is being generated
        </h1>
        <p className="font-mono text-[12px] text-terminal-fg-secondary">
          This report is currently being compiled. Please check back in a few minutes.
        </p>
        <div className="flex items-center justify-center gap-1 mt-2">
          <span className="font-mono text-[20px] text-user-accent animate-pulse">•</span>
          <span className="font-mono text-[20px] text-user-accent animate-pulse [animation-delay:200ms]">•</span>
          <span className="font-mono text-[20px] text-user-accent animate-pulse [animation-delay:400ms]">•</span>
        </div>
      </div>
    </div>
  )
}

function ReportFailed({ message }: { message: string | null }): React.ReactElement {
  return (
    <div className="min-h-screen bg-terminal-bg-base flex items-center justify-center">
      <div className="max-w-md text-center space-y-4 px-6">
        <p className="font-mono text-[11px] uppercase tracking-wider text-status-error">
          Status: Failed
        </p>
        <h1 className="font-mono text-[20px] font-bold text-terminal-fg-primary">
          Report generation failed
        </h1>
        <p className="font-mono text-[12px] text-terminal-fg-secondary">
          {message ?? 'An error occurred during report generation. Please contact support.'}
        </p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default async function ReportPage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<React.ReactElement> {
  const { slug } = await params

  const { data: report } = await tables.research_reports
    .select('*, research_subscriptions(name, branding)')
    .eq('slug', slug)
    .single()

  // Unknown report
  if (!report) {
    return <ReportNotFound />
  }

  // Cast through unknown for safe typed access — DB returns Json columns as unknown
  const typed = report as unknown as ResearchReport & {
    research_subscriptions: { name: string; branding: Record<string, unknown> } | null
  }

  // Status-based early returns
  if (typed.status === 'generating') {
    return <ReportGenerating />
  }

  if (typed.status === 'failed') {
    return <ReportFailed message={typed.error_message} />
  }

  // Normalize arrays — DB may return null or empty
  const sections: ReportSection[] = Array.isArray(typed.sections) ? typed.sections : []
  const rawFindings: KeyFinding[] = Array.isArray(typed.key_findings) ? typed.key_findings : []
  const dataSourcesUsed: string[] = Array.isArray(typed.data_sources_used)
    ? typed.data_sources_used
    : []

  // Resolve subscription name
  const subscriptionName = typed.research_subscriptions?.name ?? null

  // Normalize sentiment — only show if populated
  const sentiment = typed.sentiment_data as ReportSentiment | null
  const hasSentiment =
    sentiment &&
    typeof sentiment === 'object' &&
    'overall' in sentiment &&
    'score' in sentiment

  return (
    <div className="bg-terminal-bg-base min-h-screen">
      <div className="max-w-4xl mx-auto py-8 px-6">

        {/* ── Report Header ────────────────────────────────────────────── */}
        <header className="mb-8">
          <div className="border-b border-terminal-border-strong pb-6">
            {/* Subscription byline */}
            {subscriptionName && (
              <p className="font-mono text-[10px] uppercase tracking-wider text-terminal-fg-tertiary mb-2">
                {subscriptionName}
              </p>
            )}

            <h1 className="font-mono text-[20px] font-bold text-terminal-fg-primary leading-tight mb-4">
              {typed.title}
            </h1>

            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {typed.period_start && typed.period_end && (
                <MetaTag
                  label="Period"
                  value={`${formatDate(typed.period_start)} – ${formatDate(typed.period_end)}`}
                />
              )}
              {typed.source_count > 0 && (
                <MetaTag
                  label="Sources"
                  value={`${typed.source_count} across ${dataSourcesUsed.length} data source${dataSourcesUsed.length !== 1 ? 's' : ''}`}
                />
              )}
              <MetaTag
                label="Generated"
                value={formatDateTime(typed.created_at)}
              />
            </div>
          </div>
        </header>

        {/* ── Executive Summary ────────────────────────────────────────── */}
        {typed.executive_summary && (
          <>
            <section>
              <SectionHeading>Executive Summary</SectionHeading>
              <div className="space-y-4">
                {typed.executive_summary.split('\n\n').map((para, i) => (
                  <p
                    key={i}
                    className="font-mono text-[12px] leading-relaxed text-terminal-fg-secondary whitespace-pre-wrap"
                  >
                    {para.trim()}
                  </p>
                ))}
              </div>
            </section>
            <Divider />
          </>
        )}

        {/* ── Key Findings ─────────────────────────────────────────────── */}
        {rawFindings.length > 0 && (
          <>
            <section>
              <SectionHeading>Key Findings</SectionHeading>
              <ol className="space-y-3">
                {rawFindings.map((finding, i) => {
                  const rich = isRichFinding(finding)
                  const text = rich ? finding.finding : finding
                  const significance = rich ? finding.significance : null
                  const findingSources = rich && finding.sources ? finding.sources : []

                  return (
                    <li key={i}>
                      <div className="border border-terminal-border bg-terminal-bg-surface px-4 py-3">
                        <div className="flex gap-4 items-start">
                          <span className="font-mono text-[12px] font-semibold text-terminal-fg-tertiary shrink-0 mt-[1px]">
                            {String(i + 1).padStart(2, '0')}.
                          </span>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <p className="font-mono text-[12px] leading-relaxed text-terminal-fg-secondary">
                                {text}
                              </p>
                              {significance && (
                                <SignificanceBadge significance={significance} />
                              )}
                            </div>
                            {findingSources.length > 0 && (
                              <ul className="space-y-0.5 pl-1">
                                {findingSources.map((src, j) => (
                                  <li key={j} className="font-mono text-[10px] text-terminal-fg-tertiary">
                                    <a
                                      href={src}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:text-user-accent break-all"
                                    >
                                      {src}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
            <Divider />
          </>
        )}

        {/* ── Report Sections ──────────────────────────────────────────── */}
        {sections.length > 0 && (
          <>
            {sections.map((section, i) => (
              <div key={i}>
                <ReportSectionBlock section={section} index={i} />
                {i < sections.length - 1 && <Divider />}
              </div>
            ))}
            <Divider />
          </>
        )}

        {/* ── Sentiment Analysis ───────────────────────────────────────── */}
        {hasSentiment && sentiment && (
          <>
            <section>
              <SectionHeading>Sentiment Analysis</SectionHeading>
              <div className="border border-terminal-border bg-terminal-bg-surface px-5 py-4 space-y-4">
                {/* Overall badge + score */}
                <div className="flex items-center gap-4">
                  <SentimentBadge sentiment={sentiment.overall} />
                  <span className="font-mono text-[12px] text-terminal-fg-secondary">
                    Score:{' '}
                    <span className="text-terminal-fg-primary font-semibold">
                      {sentiment.score >= 0 ? '+' : ''}{sentiment.score.toFixed(2)}
                    </span>
                    <span className="text-terminal-fg-tertiary text-[10px] ml-1">
                      (−1.0 to +1.0)
                    </span>
                  </span>
                </div>

                {/* Breakdown bars */}
                {sentiment.breakdown && (
                  <div className="space-y-2">
                    {(
                      [
                        { label: 'Positive', value: sentiment.breakdown.positive, color: 'bg-status-ok' },
                        { label: 'Neutral', value: sentiment.breakdown.neutral, color: 'bg-terminal-border-strong' },
                        { label: 'Negative', value: sentiment.breakdown.negative, color: 'bg-status-error' },
                      ] as const
                    ).map(({ label, value, color }) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-terminal-fg-tertiary w-16 shrink-0">
                          {label}
                        </span>
                        <div className="flex-1 bg-terminal-bg-base rounded-sm h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${color} rounded-sm`}
                            style={{ width: `${Math.round(value * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-terminal-fg-secondary w-8 text-right shrink-0">
                          {Math.round(value * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
            <Divider />
          </>
        )}

        {/* ── Sources & Methodology ────────────────────────────────────── */}
        <section>
          <SectionHeading>Sources &amp; Methodology</SectionHeading>
          <div className="space-y-2">
            {dataSourcesUsed.length > 0 && (
              <div className="flex gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-terminal-fg-tertiary shrink-0">
                  Data sources used:
                </span>
                <span className="font-mono text-[11px] text-terminal-fg-secondary">
                  {dataSourcesUsed.join(', ')}
                </span>
              </div>
            )}
            {typed.source_count > 0 && (
              <div className="flex gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-terminal-fg-tertiary shrink-0">
                  Total sources analyzed:
                </span>
                <span className="font-mono text-[11px] text-terminal-fg-secondary">
                  {typed.source_count}
                </span>
              </div>
            )}
            {typed.generation_time_ms !== null && (
              <div className="flex gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-terminal-fg-tertiary shrink-0">
                  Generation time:
                </span>
                <span className="font-mono text-[11px] text-terminal-fg-secondary">
                  {formatGenerationTime(typed.generation_time_ms)}
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-terminal-fg-tertiary shrink-0">
                Report ID:
              </span>
              <span className="font-mono text-[11px] text-terminal-fg-secondary break-all">
                {typed.id}
              </span>
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer className="mt-12 pt-4 border-t border-terminal-border">
          <p className="font-mono text-[10px] text-terminal-fg-tertiary">
            Powered by dea-exmachina research intelligence
          </p>
        </footer>

      </div>
    </div>
  )
}
