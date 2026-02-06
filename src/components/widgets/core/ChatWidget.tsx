'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { WidgetProps } from '@/lib/widgets/registry'

interface Message {
  id: string
  sender: 'user' | 'dea'
  content: string
  created_at: string
  in_reply_to?: string | null
}

export function ChatWidget({ projectId, config, editMode }: WidgetProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize Supabase client for real-time subscriptions
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load message history
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const params = new URLSearchParams()
        if (projectId) params.set('project_id', projectId)
        params.set('limit', '100')

        const response = await fetch(`/api/messages?${params}`)
        if (!response.ok) {
          throw new Error('Failed to load messages')
        }

        const data: Message[] = await response.json()
        setMessages(data)
      } catch (err) {
        console.error('Error loading messages:', err)
        setError('Failed to load message history')
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
  }, [projectId])

  // Subscribe to new messages from dea
  useEffect(() => {
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: projectId ? `project_id=eq.${projectId}` : undefined,
        },
        (payload) => {
          const newMessage = payload.new as Message
          // Only add if it's from dea (user messages are added optimistically)
          if (newMessage.sender === 'dea') {
            setMessages((prev) => [...prev, newMessage])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId])

  const sendMessage = async () => {
    if (!input.trim() || sending) return

    const content = input.trim()
    setSending(true)
    setInput('')

    try {
      // Optimistically add user message
      const optimisticMessage: Message = {
        id: crypto.randomUUID(),
        sender: 'user',
        content,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, optimisticMessage])

      // Send to API
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          project_id: projectId || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data: Message = await response.json()

      // Replace optimistic message with real one
      setMessages((prev) =>
        prev.map((msg) => (msg.id === optimisticMessage.id ? data : msg))
      )
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message')
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id))
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (editMode) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
        <div>
          <h3 className="mb-2 font-semibold">Chat Widget</h3>
          <p className="text-muted-foreground text-sm">
            Real-time messaging with dea runtime
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="border-border border-b p-4">
        <h3 className="font-semibold">Chat with dea</h3>
        <p className="text-muted-foreground text-xs">
          {projectId ? 'Project-scoped conversation' : 'Global conversation'}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground text-sm">
              Loading messages...
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-muted-foreground mb-2 text-sm">
              No messages yet
            </div>
            <div className="text-muted-foreground text-xs">
              Send a message to start chatting with dea
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.sender === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
              <div
                className={`mt-1 text-xs ${
                  msg.sender === 'user'
                    ? 'text-primary-foreground/70'
                    : 'text-muted-foreground'
                }`}
              >
                {new Date(msg.created_at).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-border border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message dea..."
            disabled={sending}
            className="border-input placeholder:text-muted-foreground flex-1 rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
        <div className="text-muted-foreground mt-2 text-xs">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  )
}
