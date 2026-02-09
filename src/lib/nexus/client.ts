/**
 * NEXUS Client — Agent SDK for the NEXUS orchestration engine
 *
 * Thin wrapper around Supabase providing typed access to:
 * - Card lifecycle (CRUD, lane transitions)
 * - Task details (progressive disclosure)
 * - Three-tier locking (task, file, scope)
 * - Event subscriptions (Realtime)
 * - Comments (read for benders, write for dea/user)
 * - Agent sessions (presence tracking)
 * - Context packages (auto-assembled execution context)
 *
 * Usage:
 *   import { createNexusClient } from '@/lib/nexus/client'
 *   const nexus = createNexusClient(supabaseUrl, supabaseKey, 'dea')
 *   const card = await nexus.getCard('DEA-042')
 *
 * DEA-042 | NEXUS Phase 0
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type {
  NexusCard, NexusCardCreate, NexusCardUpdate, CardFilters,
  NexusTaskDetails, NexusTaskDetailsCreate, NexusTaskDetailsUpdate,
  NexusComment, NexusCommentCreate,
  NexusLock, NexusLockRequest, NexusLockConflict, LockType,
  NexusEvent, NexusEventType, EventFilters,
  NexusContextPackage,
  NexusAgentSession, NexusAgentSessionCreate,
  NexusProject, CardLane, BenderLane,
  ContextLayers,
} from '@/types/nexus'

// ── Client Factory ──────────────────────────────────────

export interface NexusClientOptions {
  /** Default lock timeout in hours */
  lockTimeoutHours?: number
}

export function createNexusClient(
  supabaseUrl: string,
  supabaseKey: string,
  actor: string,
  options: NexusClientOptions = {}
): NexusClient {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { 'x-nexus-actor': actor },
    },
  })
  return new NexusClient(supabase, actor, options)
}

// ── Main Client ─────────────────────────────────────────

export class NexusClient {
  private supabase: SupabaseClient
  private actor: string
  private lockTimeoutHours: number
  private subscriptions: Map<string, RealtimeChannel> = new Map()

  constructor(
    supabase: SupabaseClient,
    actor: string,
    options: NexusClientOptions = {}
  ) {
    this.supabase = supabase
    this.actor = actor
    this.lockTimeoutHours = options.lockTimeoutHours ?? 4
  }

  // ── Projects ────────────────────────────────────────

  async getProjects(): Promise<NexusProject[]> {
    const { data, error } = await this.supabase
      .from('nexus_projects')
      .select('*')
      .order('name')
    if (error) throw new NexusError('getProjects', error.message)
    return data as NexusProject[]
  }

  async getProject(slug: string): Promise<NexusProject | null> {
    const { data, error } = await this.supabase
      .from('nexus_projects')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
    if (error) throw new NexusError('getProject', error.message)
    return data as NexusProject | null
  }

  // ── Cards ───────────────────────────────────────────

  async getCard(cardId: string): Promise<NexusCard | null> {
    const { data, error } = await this.supabase
      .from('nexus_cards')
      .select('*')
      .eq('card_id', cardId)
      .maybeSingle()
    if (error) throw new NexusError('getCard', error.message)
    return data as NexusCard | null
  }

  async getCardById(id: string): Promise<NexusCard | null> {
    const { data, error } = await this.supabase
      .from('nexus_cards')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new NexusError('getCardById', error.message)
    return data as NexusCard | null
  }

  async listCards(filters: CardFilters = {}): Promise<NexusCard[]> {
    let query = this.supabase.from('nexus_cards').select('*')

    if (filters.lane) {
      if (Array.isArray(filters.lane)) {
        query = query.in('lane', filters.lane)
      } else {
        query = query.eq('lane', filters.lane)
      }
    }
    if (filters.bender_lane) {
      if (Array.isArray(filters.bender_lane)) {
        query = query.in('bender_lane', filters.bender_lane)
      } else {
        query = query.eq('bender_lane', filters.bender_lane)
      }
    }
    if (filters.project_id) query = query.eq('project_id', filters.project_id)
    if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to)
    if (filters.delegation_tag) query = query.eq('delegation_tag', filters.delegation_tag)
    if (filters.priority) query = query.eq('priority', filters.priority)
    if (filters.card_type) query = query.eq('card_type', filters.card_type)
    if (filters.parent_id !== undefined) {
      if (filters.parent_id === null) {
        query = query.is('parent_id', null)
      } else {
        query = query.eq('parent_id', filters.parent_id)
      }
    }
    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags)
    }
    if (filters.due_before) query = query.lte('due_date', filters.due_before)
    if (filters.due_after) query = query.gte('due_date', filters.due_after)

    const { data, error } = await query.order('created_at', { ascending: true })
    if (error) throw new NexusError('listCards', error.message)
    return data as NexusCard[]
  }

  async createCard(card: NexusCardCreate): Promise<NexusCard> {
    const { data, error } = await this.supabase
      .from('nexus_cards')
      .insert(card)
      .select()
      .single()
    if (error) throw new NexusError('createCard', error.message)

    // Emit creation event
    await this.emitEvent('card.created', (data as NexusCard).id, {
      card_id: (data as NexusCard).card_id,
      lane: card.lane,
      title: card.title,
    })

    return data as NexusCard
  }

  async updateCard(cardId: string, updates: NexusCardUpdate): Promise<NexusCard> {
    const { data, error } = await this.supabase
      .from('nexus_cards')
      .update(updates)
      .eq('card_id', cardId)
      .select()
      .single()
    if (error) throw new NexusError('updateCard', error.message)
    return data as NexusCard
  }

  async moveCard(cardId: string, toLane: CardLane): Promise<NexusCard> {
    return this.updateCard(cardId, { lane: toLane })
  }

  async moveCardBenderLane(cardId: string, toBenderLane: BenderLane | null): Promise<NexusCard> {
    return this.updateCard(cardId, { bender_lane: toBenderLane })
  }

  async getChildren(parentCardId: string): Promise<NexusCard[]> {
    // First resolve card_id → UUID
    const parent = await this.getCard(parentCardId)
    if (!parent) return []

    const { data, error } = await this.supabase
      .from('nexus_cards')
      .select('*')
      .eq('parent_id', parent.id)
      .order('created_at', { ascending: true })
    if (error) throw new NexusError('getChildren', error.message)
    return data as NexusCard[]
  }

  // ── Task Details ────────────────────────────────────

  async getTaskDetails(cardId: string): Promise<NexusTaskDetails | null> {
    const card = await this.getCard(cardId)
    if (!card) return null

    const { data, error } = await this.supabase
      .from('nexus_task_details')
      .select('*')
      .eq('card_id', card.id)
      .maybeSingle()
    if (error) throw new NexusError('getTaskDetails', error.message)
    return data as NexusTaskDetails | null
  }

  async createTaskDetails(details: NexusTaskDetailsCreate): Promise<NexusTaskDetails> {
    const { data, error } = await this.supabase
      .from('nexus_task_details')
      .insert(details)
      .select()
      .single()
    if (error) throw new NexusError('createTaskDetails', error.message)
    return data as NexusTaskDetails
  }

  async updateTaskDetails(cardId: string, updates: NexusTaskDetailsUpdate): Promise<NexusTaskDetails> {
    const card = await this.getCard(cardId)
    if (!card) throw new NexusError('updateTaskDetails', `Card not found: ${cardId}`)

    const { data, error } = await this.supabase
      .from('nexus_task_details')
      .update(updates)
      .eq('card_id', card.id)
      .select()
      .single()
    if (error) throw new NexusError('updateTaskDetails', error.message)
    return data as NexusTaskDetails
  }

  async updateExecutionNotes(cardId: string, notes: string): Promise<void> {
    await this.updateTaskDetails(cardId, { execution_notes: notes })
  }

  // ── Comments ────────────────────────────────────────

  async getComments(cardId: string): Promise<NexusComment[]> {
    const card = await this.getCard(cardId)
    if (!card) return []

    const { data, error } = await this.supabase
      .from('nexus_comments')
      .select('*')
      .eq('card_id', card.id)
      .order('created_at', { ascending: true })
    if (error) throw new NexusError('getComments', error.message)
    return data as NexusComment[]
  }

  async addComment(comment: NexusCommentCreate): Promise<NexusComment> {
    // Resolve card_id text → UUID
    const card = await this.getCard(comment.card_id)
    if (!card) throw new NexusError('addComment', `Card not found: ${comment.card_id}`)

    const { data, error } = await this.supabase
      .from('nexus_comments')
      .insert({ ...comment, card_id: card.id })
      .select()
      .single()
    if (error) throw new NexusError('addComment', error.message)
    return data as NexusComment
  }

  async resolveComment(commentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('nexus_comments')
      .update({
        resolved: true,
        resolved_by: this.actor,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', commentId)
    if (error) throw new NexusError('resolveComment', error.message)
  }

  async getUnresolvedPivots(cardId: string): Promise<NexusComment[]> {
    const card = await this.getCard(cardId)
    if (!card) return []

    const { data, error } = await this.supabase
      .from('nexus_comments')
      .select('*')
      .eq('card_id', card.id)
      .eq('is_pivot', true)
      .eq('resolved', false)
      .order('created_at', { ascending: true })
    if (error) throw new NexusError('getUnresolvedPivots', error.message)
    return data as NexusComment[]
  }

  // ── Locks ───────────────────────────────────────────

  async acquireLock(request: NexusLockRequest): Promise<NexusLock> {
    // Check for conflicts first
    const conflicts = await this.checkConflicts(request.lock_type, request.target)
    if (conflicts.length > 0) {
      const conflict = conflicts[0]
      // Same agent can extend
      if (conflict.conflicting_lock.agent === request.agent) {
        const { data, error } = await this.supabase
          .from('nexus_locks')
          .update({
            expires_at: request.expires_at ?? this.defaultExpiry(),
          })
          .eq('id', conflict.conflicting_lock.id)
          .select()
          .single()
        if (error) throw new NexusError('acquireLock', error.message)
        return data as NexusLock
      }
      throw new NexusLockConflictError(conflict)
    }

    // Resolve card_id if provided
    let resolvedCardId: string | undefined
    if (request.card_id) {
      const card = await this.getCard(request.card_id)
      if (card) resolvedCardId = card.id
    }

    const { data, error } = await this.supabase
      .from('nexus_locks')
      .insert({
        lock_type: request.lock_type,
        card_id: resolvedCardId,
        agent: request.agent,
        target: request.target,
        expires_at: request.expires_at ?? this.defaultExpiry(),
        metadata: request.metadata ?? {},
      })
      .select()
      .single()
    if (error) throw new NexusError('acquireLock', error.message)
    return data as NexusLock
  }

  async releaseLock(lockId: string): Promise<void> {
    const { error } = await this.supabase
      .from('nexus_locks')
      .update({ released_at: new Date().toISOString() })
      .eq('id', lockId)
    if (error) throw new NexusError('releaseLock', error.message)
  }

  async releaseAllLocks(agent: string, cardId?: string): Promise<void> {
    let query = this.supabase
      .from('nexus_locks')
      .update({ released_at: new Date().toISOString() })
      .eq('agent', agent)
      .is('released_at', null)

    if (cardId) {
      const card = await this.getCard(cardId)
      if (card) query = query.eq('card_id', card.id)
    }

    const { error } = await query
    if (error) throw new NexusError('releaseAllLocks', error.message)
  }

  async checkConflicts(
    lockType: LockType,
    target: string
  ): Promise<NexusLockConflict[]> {
    // Get all active locks of this type
    const { data, error } = await this.supabase
      .from('nexus_locks')
      .select('*')
      .eq('lock_type', lockType)
      .is('released_at', null)

    if (error) throw new NexusError('checkConflicts', error.message)
    if (!data) return []

    const now = new Date()
    const conflicts: NexusLockConflict[] = []

    for (const lock of data as NexusLock[]) {
      // Skip expired locks
      if (lock.expires_at && new Date(lock.expires_at) < now) continue

      // Check for overlap
      const overlaps = lockType === 'scope'
        ? this.scopeOverlaps(lock.target, target)
        : lock.target === target

      if (overlaps) {
        conflicts.push({
          conflicting_lock: lock,
          requested_target: target,
          requested_by: this.actor,
        })
      }
    }

    return conflicts
  }

  async checkScopeConflicts(declaredScope: string[]): Promise<NexusLockConflict[]> {
    const allConflicts: NexusLockConflict[] = []
    for (const scope of declaredScope) {
      const conflicts = await this.checkConflicts('scope', scope)
      allConflicts.push(...conflicts)
    }
    // Also check file-level locks that overlap with declared scope
    for (const scope of declaredScope) {
      const fileConflicts = await this.checkConflicts('file', scope)
      allConflicts.push(...fileConflicts)
    }
    return allConflicts
  }

  async cleanupExpiredLocks(): Promise<number> {
    const { data, error } = await this.supabase.rpc('nexus_cleanup_expired_locks_rpc')
    if (error) throw new NexusError('cleanupExpiredLocks', error.message)
    return (data as { released: number }).released
  }

  async getActiveLocks(agent?: string): Promise<NexusLock[]> {
    let query = this.supabase
      .from('nexus_locks')
      .select('*')
      .is('released_at', null)
      .order('acquired_at', { ascending: false })

    if (agent) query = query.eq('agent', agent)

    const { data, error } = await query
    if (error) throw new NexusError('getActiveLocks', error.message)
    return data as NexusLock[]
  }

  // ── Events ──────────────────────────────────────────

  async emitEvent(
    eventType: NexusEventType | string,
    cardId: string | null,
    payload: Record<string, unknown>
  ): Promise<NexusEvent> {
    const { data, error } = await this.supabase
      .from('nexus_events')
      .insert({
        event_type: eventType,
        card_id: cardId,
        actor: this.actor,
        payload,
      })
      .select()
      .single()
    if (error) throw new NexusError('emitEvent', error.message)
    return data as NexusEvent
  }

  async getEvents(filters: EventFilters = {}): Promise<NexusEvent[]> {
    let query = this.supabase
      .from('nexus_events')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.card_id) query = query.eq('card_id', filters.card_id)
    if (filters.event_type) {
      if (Array.isArray(filters.event_type)) {
        query = query.in('event_type', filters.event_type)
      } else {
        query = query.eq('event_type', filters.event_type)
      }
    }
    if (filters.actor) query = query.eq('actor', filters.actor)
    if (filters.since) query = query.gte('created_at', filters.since)
    if (filters.limit) query = query.limit(filters.limit)

    const { data, error } = await query
    if (error) throw new NexusError('getEvents', error.message)
    return data as NexusEvent[]
  }

  subscribe(
    channel: string,
    table: string,
    filter: string | undefined,
    handler: (payload: Record<string, unknown>) => void
  ): RealtimeChannel {
    const sub = this.supabase
      .channel(channel)
      .on(
        'postgres_changes' as never,
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        } as never,
        handler as never
      )
      .subscribe()

    this.subscriptions.set(channel, sub)
    return sub
  }

  async unsubscribe(channel: string): Promise<void> {
    const sub = this.subscriptions.get(channel)
    if (sub) {
      await this.supabase.removeChannel(sub)
      this.subscriptions.delete(channel)
    }
  }

  async unsubscribeAll(): Promise<void> {
    for (const [, sub] of this.subscriptions) {
      await this.supabase.removeChannel(sub)
    }
    this.subscriptions.clear()
  }

  // ── Progressive Disclosure ─────────────────────────

  /** Layer 0: Card index only (lightweight) */
  async getLayer0(cardId: string): Promise<NexusCard | null> {
    return this.getCard(cardId)
  }

  /** Layer 1: Card + task details (on demand) */
  async getLayer1(cardId: string): Promise<{ card: NexusCard; details: NexusTaskDetails | null; comments: NexusComment[] } | null> {
    const card = await this.getCard(cardId)
    if (!card) return null
    const [details, comments] = await Promise.all([
      this.getTaskDetails(cardId),
      this.getComments(cardId),
    ])
    return { card, details, comments }
  }

  /** Layer 2: Full context package (for execution) */
  async getLayer2(cardId: string): Promise<{
    card: NexusCard
    details: NexusTaskDetails | null
    comments: NexusComment[]
    context: NexusContextPackage | null
    children: NexusCard[]
  } | null> {
    const card = await this.getCard(cardId)
    if (!card) return null
    const [details, comments, context, children] = await Promise.all([
      this.getTaskDetails(cardId),
      this.getComments(cardId),
      this.getContextPackage(cardId),
      this.getChildren(cardId),
    ])
    return { card, details, comments, context, children }
  }

  // ── Context Packages ────────────────────────────────

  async getContextPackage(cardId: string): Promise<NexusContextPackage | null> {
    const card = await this.getCard(cardId)
    if (!card) return null

    const { data, error } = await this.supabase
      .from('nexus_context_packages')
      .select('*')
      .eq('card_id', card.id)
      .eq('stale', false)
      .order('assembled_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new NexusError('getContextPackage', error.message)
    return data as NexusContextPackage | null
  }

  /** Assemble a fresh context package for a card, marking old ones stale */
  async assembleContextPackage(cardId: string): Promise<NexusContextPackage> {
    const card = await this.getCard(cardId)
    if (!card) throw new NexusError('assembleContextPackage', `Card not found: ${cardId}`)

    const [details, comments, children, project] = await Promise.all([
      this.getTaskDetails(cardId),
      this.getComments(cardId),
      this.getChildren(cardId),
      card.project_id
        ? this.supabase.from('nexus_projects').select('slug, name, delegation_policy').eq('id', card.project_id).single().then(r => r.data as NexusProject | null)
        : Promise.resolve(null),
    ])

    const layers: ContextLayers = {
      base: [
        `Card: ${card.card_id} — ${card.title}`,
        `Type: ${card.card_type} | Lane: ${card.lane} | Priority: ${card.priority}`,
        card.assigned_to ? `Assigned: ${card.assigned_to}` : 'Unassigned',
        ...(card.bender_lane ? [`Bender lane: ${card.bender_lane}`] : []),
      ],
      task_type: details ? [
        details.overview ?? '',
        ...(details.requirements ? [`Requirements: ${details.requirements}`] : []),
        ...(details.acceptance_criteria ? [`Criteria: ${details.acceptance_criteria}`] : []),
        ...(details.constraints ? [`Constraints: ${details.constraints}`] : []),
        ...(details.deliverables ? [`Deliverables: ${details.deliverables}`] : []),
      ].filter(Boolean) : [],
      project: project ? [
        `Project: ${project.name} (${project.slug})`,
        `Policy: ${project.delegation_policy}`,
      ] : [],
      comments: comments.map(c =>
        `[${c.comment_type}${c.is_pivot ? '/pivot' : ''}] ${c.author}: ${c.content}`
      ),
    }

    const assembledFiles = details?.declared_scope ?? []
    const assembledContent = [
      ...layers.base ?? [],
      '',
      ...(layers.task_type?.length ? ['--- Task Details ---', ...layers.task_type, ''] : []),
      ...(layers.project?.length ? ['--- Project ---', ...layers.project, ''] : []),
      ...(children.length ? [
        '--- Subtasks ---',
        ...children.map(c => `  ${c.card_id}: ${c.title} [${c.lane}]`),
        '',
      ] : []),
      ...(layers.comments?.length ? ['--- Comments ---', ...layers.comments] : []),
    ].join('\n')

    // Mark old packages stale
    await this.supabase
      .from('nexus_context_packages')
      .update({ stale: true })
      .eq('card_id', card.id)
      .eq('stale', false)

    // Insert fresh package
    const { data, error } = await this.supabase
      .from('nexus_context_packages')
      .insert({
        card_id: card.id,
        layers,
        assembled_files: assembledFiles,
        assembled_content: assembledContent,
        assembled_at: new Date().toISOString(),
        stale: false,
      })
      .select()
      .single()
    if (error) throw new NexusError('assembleContextPackage', error.message)

    await this.emitEvent('context.stale', card.id, { reason: 'reassembled', package_id: (data as NexusContextPackage).id })

    return data as NexusContextPackage
  }

  // ── Agent Sessions ──────────────────────────────────

  async startSession(create: NexusAgentSessionCreate): Promise<NexusAgentSession> {
    // Resolve card_id if provided
    let resolvedCardId: string | undefined
    if (create.card_id) {
      const card = await this.getCard(create.card_id)
      if (card) resolvedCardId = card.id
    }

    const { data, error } = await this.supabase
      .from('nexus_agent_sessions')
      .insert({
        agent: create.agent,
        model: create.model,
        card_id: resolvedCardId,
        metadata: create.metadata ?? {},
      })
      .select()
      .single()
    if (error) throw new NexusError('startSession', error.message)

    // Emit session event
    await this.emitEvent('session.started', resolvedCardId ?? null, {
      session_id: (data as NexusAgentSession).id,
      agent: create.agent,
      model: create.model,
    })

    return data as NexusAgentSession
  }

  async endSession(sessionId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('nexus_agent_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single()
    if (error) throw new NexusError('endSession', error.message)

    const session = data as NexusAgentSession
    await this.emitEvent('session.ended', session.card_id, {
      session_id: sessionId,
      agent: session.agent,
      duration_ms: session.started_at
        ? Date.now() - new Date(session.started_at).getTime()
        : null,
    })
  }

  async getActiveSessions(): Promise<NexusAgentSession[]> {
    const { data, error } = await this.supabase
      .from('nexus_agent_sessions')
      .select('*')
      .eq('status', 'active')
      .order('started_at', { ascending: false })
    if (error) throw new NexusError('getActiveSessions', error.message)
    return data as NexusAgentSession[]
  }

  // ── Internal Helpers ────────────────────────────────

  private defaultExpiry(): string {
    return new Date(Date.now() + this.lockTimeoutHours * 60 * 60 * 1000).toISOString()
  }

  private scopeOverlaps(existingTarget: string, requestedTarget: string): boolean {
    // Path-prefix matching: 'src/components/auth/' overlaps 'src/components/auth/login.tsx'
    const a = existingTarget.replace(/\\/g, '/')
    const b = requestedTarget.replace(/\\/g, '/')
    return a.startsWith(b) || b.startsWith(a)
  }
}

// ── Error Types ─────────────────────────────────────────

export class NexusError extends Error {
  constructor(public operation: string, message: string) {
    super(`NEXUS.${operation}: ${message}`)
    this.name = 'NexusError'
  }
}

export class NexusLockConflictError extends NexusError {
  public conflict: NexusLockConflict

  constructor(conflict: NexusLockConflict) {
    super(
      'acquireLock',
      `Lock conflict on "${conflict.requested_target}" — held by ${conflict.conflicting_lock.agent} (${conflict.conflicting_lock.lock_type})`
    )
    this.name = 'NexusLockConflictError'
    this.conflict = conflict
  }
}
