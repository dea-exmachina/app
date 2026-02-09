'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { NexusComment, CommentType } from '@/types/nexus'
import {
  getComments,
  postComment as apiPostComment,
  resolveComment as apiResolveComment,
  editComment as apiEditComment,
  deleteComment as apiDeleteComment,
} from '@/lib/client/api'

const REALTIME_TIMEOUT_MS = 5000

interface UseCommentsRealtimeParams {
  cardId: string          // Display ID (e.g., "DEA-042")
  pollInterval?: number   // Fallback polling interval in ms, default 10000
}

interface UseCommentsRealtimeResult {
  comments: NexusComment[]
  loading: boolean
  error: string | null
  isLive: boolean
  refresh: () => void
  postComment: (content: string, commentType: CommentType) => Promise<void>
  resolveComment: (commentId: string) => Promise<void>
  editComment: (commentId: string, content: string) => Promise<void>
  deleteComment: (commentId: string) => Promise<void>
}

export function useCommentsRealtime(
  params: UseCommentsRealtimeParams
): UseCommentsRealtimeResult {
  const [comments, setComments] = useState<NexusComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const commentIdsRef = useRef<Set<string>>(new Set())
  const cardUuidRef = useRef<string | null>(null)

  const { cardId, pollInterval = 10000 } = params
  const paramsKey = useMemo(() => cardId, [cardId])

  // Fetch comments via API
  const fetchComments = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true)
    setError(null)

    try {
      const { data } = await getComments(cardId)
      setComments(data)
      commentIdsRef.current = new Set(data.map((c) => c.id))

      // Extract card UUID from first comment for Realtime filter
      if (data.length > 0 && !cardUuidRef.current) {
        cardUuidRef.current = data[0].card_id
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [cardId])

  // Polling functions
  const startPolling = useCallback(() => {
    if (pollInterval <= 0 || intervalRef.current) return
    intervalRef.current = setInterval(() => fetchComments(false), pollInterval)
  }, [fetchComments, pollInterval])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchComments(true)
  }, [fetchComments])

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )

    // Timeout: fall back to polling if Realtime doesn't connect
    timeoutRef.current = setTimeout(() => {
      if (!isLive) {
        startPolling()
      }
    }, REALTIME_TIMEOUT_MS)

    const channel = supabase
      .channel(`card-comments-${paramsKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nexus_comments',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newComment = payload.new as NexusComment

            // Filter: only comments for this card
            if (cardUuidRef.current && newComment.card_id !== cardUuidRef.current) return

            // Dedup
            if (commentIdsRef.current.has(newComment.id)) return
            commentIdsRef.current.add(newComment.id)

            // Store UUID for future filtering
            if (!cardUuidRef.current) {
              cardUuidRef.current = newComment.card_id
            }

            setComments((prev) => [...prev, newComment])
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as NexusComment
            setComments((prev) =>
              prev.map((c) => (c.id === updated.id ? updated : c))
            )
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLive(true)
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
          stopPolling()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsLive(false)
          startPolling()
        } else if (status === 'CLOSED') {
          setIsLive(false)
        }
      })

    return () => {
      supabase.removeChannel(channel)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      stopPolling()
    }
  }, [paramsKey])

  // Post a comment as 'user'
  const postComment = useCallback(async (content: string, commentType: CommentType) => {
    try {
      const { data } = await apiPostComment(cardId, {
        author: 'user',
        content,
        comment_type: commentType,
      })
      // Optimistic: add if not already present via Realtime
      if (!commentIdsRef.current.has(data.id)) {
        commentIdsRef.current.add(data.id)
        if (!cardUuidRef.current) cardUuidRef.current = data.card_id
        setComments((prev) => [...prev, data])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment')
      throw err
    }
  }, [cardId])

  // Resolve a comment
  const resolveComment = useCallback(async (commentId: string) => {
    try {
      const { data } = await apiResolveComment(cardId, commentId)
      // Optimistic update
      setComments((prev) =>
        prev.map((c) => (c.id === data.id ? data : c))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve comment')
      throw err
    }
  }, [cardId])

  // Edit a comment (user-authored only, enforced server-side)
  const editComment = useCallback(async (commentId: string, content: string) => {
    try {
      const { data } = await apiEditComment(cardId, commentId, { content })
      setComments((prev) =>
        prev.map((c) => (c.id === data.id ? data : c))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit comment')
      throw err
    }
  }, [cardId])

  // Delete a comment (user-authored only, enforced server-side)
  const deleteComment = useCallback(async (commentId: string) => {
    try {
      await apiDeleteComment(cardId, commentId)
      commentIdsRef.current.delete(commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment')
      throw err
    }
  }, [cardId])

  const refresh = useCallback(() => {
    fetchComments(true)
  }, [fetchComments])

  return { comments, loading, error, isLive, refresh, postComment, resolveComment, editComment, deleteComment }
}
