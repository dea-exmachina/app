'use client'

/**
 * Card Detail Page — /kanban/card/[cardId]
 *
 * Deep-linkable full page for any NEXUS card.
 * Shows card metadata, summary, comments, audit trail, and children.
 *
 * CC-022
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Flag,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { getCard } from '@/lib/client/api'
import type { NexusCard } from '@/types/nexus'
import { CommentThread } from '@/components/kanban/CommentThread'
import { EventTimeline } from '@/components/kanban/EventTimeline'
import { SectionDivider } from '@/components/ui/section-divider'
import { formatDate, formatRelativeDate } from '@/lib/client/formatters'

// ── Lane + Priority colors ──────────────────────────────

const LANE_COLORS: Record<string, string> = {
  backlog: 'bg-terminal-fg-tertiary/20 text-terminal-fg-tertiary',
  ready: 'bg-blue-500/15 text-blue-400',
  in_progress: 'bg-amber-500/15 text-amber-400',
  review: 'bg-purple-500/15 text-purple-400',
  done: 'bg-emerald-500/15 text-emerald-400',
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  normal: 'bg-terminal-fg-tertiary/10 text-terminal-fg-secondary',
  low: 'bg-terminal-fg-tertiary/10 text-terminal-fg-tertiary',
}

const TYPE_COLORS: Record<string, string> = {
  epic: 'bg-purple-500/15 text-purple-400',
  task: 'bg-blue-500/15 text-blue-400',
  bug: 'bg-red-500/15 text-red-400',
  chore: 'bg-terminal-fg-tertiary/10 text-terminal-fg-secondary',
  research: 'bg-emerald-500/15 text-emerald-400',
}

// ── Children section ─────────────────────────────────────

function ChildCards({ parentId }: { parentId: string }) {
  const [children, setChildren] = useState<NexusCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/nexus/cards?parent_id=${parentId}`)
      .then((r) => r.json())
      .then((json) => setChildren(json.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [parentId])

  if (loading) return <p className="font-mono text-[11px] text-terminal-fg-tertiary">Loading children...</p>
  if (children.length === 0) return null

  return (
    <div>
      <SectionDivider label="Child Cards" count={children.length} />
      <div className="mt-2 space-y-1">
        {children.map((child) => (
          <Link
            key={child.card_id}
            href={`/kanban/card/${child.card_id}`}
            className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-terminal-bg-elevated transition-colors group"
          >
            <span className="font-mono text-[11px] font-semibold text-user-accent group-hover:underline">
              {child.card_id}
            </span>
            <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-sm ${LANE_COLORS[child.lane] ?? ''}`}>
              {child.lane}
            </span>
            <span className="font-mono text-[11px] text-terminal-fg-primary truncate flex-1">
              {child.title}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────

export default function CardDetailPage() {
  const params = useParams<{ cardId: string }>()
  const router = useRouter()
  const cardId = params.cardId

  const [card, setCard] = useState<NexusCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'comments' | 'audit'>('comments')
  const [summaryExpanded, setSummaryExpanded] = useState(true)

  const fetchCardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await getCard(cardId)
      setCard(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load card')
    } finally {
      setLoading(false)
    }
  }, [cardId])

  useEffect(() => {
    fetchCardData()
  }, [fetchCardData])

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="space-y-4">
          <div className="h-4 w-32 bg-terminal-bg-elevated rounded animate-pulse" />
          <div className="h-6 w-64 bg-terminal-bg-elevated rounded animate-pulse" />
          <div className="h-20 w-full bg-terminal-bg-elevated rounded animate-pulse" />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !card) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 font-mono text-[11px] text-terminal-fg-tertiary hover:text-terminal-fg-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </button>
        <div className="border border-terminal-border rounded-sm p-8 text-center">
          <p className="font-mono text-[13px] text-terminal-fg-primary mb-2">Card not found</p>
          <p className="font-mono text-[11px] text-terminal-fg-tertiary">{error ?? `No card with ID: ${cardId}`}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Back nav */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 font-mono text-[11px] text-terminal-fg-tertiary hover:text-terminal-fg-primary transition-colors"
      >
        <ArrowLeft className="h-3 w-3" /> Back
      </button>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[14px] font-bold text-user-accent">
            {card.card_id}
          </span>
          <span className={`font-mono text-[10px] px-2 py-0.5 rounded-sm border ${PRIORITY_COLORS[card.priority] ?? ''}`}>
            {card.priority}
          </span>
          <span className={`font-mono text-[10px] px-2 py-0.5 rounded-sm ${TYPE_COLORS[card.card_type] ?? ''}`}>
            {card.card_type}
          </span>
          <span className={`font-mono text-[10px] px-2 py-0.5 rounded-sm ${LANE_COLORS[card.lane] ?? ''}`}>
            {card.lane.replace('_', ' ')}
          </span>
          {card.ready_for_production && (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-status-ok">
              <Flag className="h-3 w-3" /> Release flagged
            </span>
          )}
        </div>
        <h1 className="font-mono text-[18px] font-semibold text-terminal-fg-primary leading-tight">
          {card.title}
        </h1>
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 font-mono text-[11px] border border-terminal-border rounded-sm p-3 bg-terminal-bg-surface">
        <div>
          <span className="text-terminal-fg-tertiary uppercase tracking-wider block">Delegation</span>
          <span className={card.delegation_tag === 'DEA' ? 'text-blue-400' : 'text-purple-400'}>
            {card.delegation_tag}
          </span>
        </div>
        {card.assigned_to && (
          <div>
            <span className="text-terminal-fg-tertiary uppercase tracking-wider block">Assignee</span>
            <span className="text-terminal-fg-primary">{card.assigned_to}</span>
          </div>
        )}
        {card.assigned_model && (
          <div>
            <span className="text-terminal-fg-tertiary uppercase tracking-wider block">Model</span>
            <span className="text-terminal-fg-primary">{card.assigned_model}</span>
          </div>
        )}
        {card.bender_lane && (
          <div>
            <span className="text-terminal-fg-tertiary uppercase tracking-wider block">Bender Lane</span>
            <span className="text-terminal-fg-primary">{card.bender_lane}</span>
          </div>
        )}
        <div>
          <span className="text-terminal-fg-tertiary uppercase tracking-wider block">Created</span>
          <span className="text-terminal-fg-secondary" title={formatDate(card.created_at)}>
            {formatRelativeDate(card.created_at)}
          </span>
        </div>
        {card.completed_at && (
          <div>
            <span className="text-terminal-fg-tertiary uppercase tracking-wider block">Completed</span>
            <span className="text-terminal-fg-secondary">{formatDate(card.completed_at)}</span>
          </div>
        )}
        {card.source && (
          <div>
            <span className="text-terminal-fg-tertiary uppercase tracking-wider block">Source</span>
            <span className="text-terminal-fg-secondary">{card.source}</span>
          </div>
        )}
        {card.parent_id && (
          <div>
            <span className="text-terminal-fg-tertiary uppercase tracking-wider block">Parent</span>
            <ParentLink parentId={card.parent_id} />
          </div>
        )}
      </div>

      {/* Tags */}
      {card.tags && card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {card.tags.map((tag) => (
            <span
              key={tag}
              className="font-mono text-[10px] px-2 py-0.5 rounded-sm bg-terminal-bg-elevated text-terminal-fg-secondary border border-terminal-border"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Framework pills */}
      {card.framework_ids && card.framework_ids.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="font-mono text-[9px] uppercase tracking-wider text-terminal-fg-tertiary">
            Frameworks:
          </span>
          {card.framework_ids.map((fwId) => (
            <span
              key={fwId}
              className="font-mono text-[10px] px-2 py-0.5 rounded-sm bg-amber-500/10 text-amber-400 border border-amber-500/25"
            >
              {fwId}
            </span>
          ))}
        </div>
      )}

      {/* Summary */}
      {card.summary && (
        <div className="border border-terminal-border rounded-sm bg-terminal-bg-surface">
          <button
            onClick={() => setSummaryExpanded(!summaryExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-terminal-bg-elevated/50 transition-colors"
          >
            <span className="font-mono text-[10px] uppercase tracking-wider text-terminal-fg-tertiary">
              Summary
            </span>
            {summaryExpanded ? (
              <ChevronUp className="h-3 w-3 text-terminal-fg-tertiary" />
            ) : (
              <ChevronDown className="h-3 w-3 text-terminal-fg-tertiary" />
            )}
          </button>
          {summaryExpanded && (
            <div className="px-3 pb-3">
              <p className="font-mono text-[12px] text-terminal-fg-primary leading-relaxed whitespace-pre-wrap">
                {card.summary}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Children */}
      <ChildCards parentId={card.id} />

      {/* Tab switcher */}
      <div className="flex border-b border-terminal-border">
        <button
          onClick={() => setActiveTab('comments')}
          className={`font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 transition-colors ${
            activeTab === 'comments'
              ? 'text-user-accent border-b-2 border-user-accent'
              : 'text-terminal-fg-tertiary hover:text-terminal-fg-secondary'
          }`}
        >
          Comments
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 transition-colors ${
            activeTab === 'audit'
              ? 'text-user-accent border-b-2 border-user-accent'
              : 'text-terminal-fg-tertiary hover:text-terminal-fg-secondary'
          }`}
        >
          Audit Trail
        </button>
      </div>

      {/* Tab content */}
      <div className="min-h-[200px]">
        {activeTab === 'comments' ? (
          <CommentThread cardId={card.card_id} />
        ) : (
          <EventTimeline cardId={card.card_id} />
        )}
      </div>
    </div>
  )
}

// ── Parent link resolver ─────────────────────────────────

function ParentLink({ parentId }: { parentId: string }) {
  const [parentCardId, setParentCardId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/nexus/cards?id=${parentId}&limit=1`)
      .then((r) => r.json())
      .then((json) => {
        const parent = (json.data ?? [])[0] as NexusCard | undefined
        if (parent) setParentCardId(parent.card_id)
      })
      .catch(() => {})
  }, [parentId])

  if (!parentCardId) {
    return <span className="text-terminal-fg-tertiary">...</span>
  }

  return (
    <Link
      href={`/kanban/card/${parentCardId}`}
      className="text-user-accent hover:underline inline-flex items-center gap-1"
    >
      {parentCardId} <ExternalLink className="h-2.5 w-2.5" />
    </Link>
  )
}
