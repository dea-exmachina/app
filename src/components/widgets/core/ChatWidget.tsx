/**
 * Chat Widget
 *
 * Real-time messaging interface for dea communication.
 * Universal widget (works for all project types).
 */

'use client'

import { WidgetProps } from '@/lib/widgets/registry'
import { useState } from 'react'

export function ChatWidget({ projectId, config, editMode }: WidgetProps) {
  const [message, setMessage] = useState('')

  // TODO: Implement chat functionality
  // - Fetch messages from /api/messages?project_id={projectId}
  // - Send messages via POST /api/messages
  // - Real-time updates via Supabase Realtime
  // - Markdown rendering for messages
  // - Message history with infinite scroll

  const handleSend = () => {
    if (!message.trim()) return
    // TODO: Send message
    console.log('Sending message:', message)
    setMessage('')
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h3 className="font-semibold">Chat with dea</h3>
        {editMode && (
          <span className="text-xs text-muted-foreground">Edit Mode</span>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-auto p-4">
        {/* Placeholder messages */}
        <div className="flex flex-col gap-2">
          <div className="self-end max-w-[70%] rounded-lg bg-primary px-3 py-2 text-primary-foreground text-sm">
            Can you help me with this project?
          </div>
          <div className="self-start max-w-[70%] rounded-lg bg-muted px-3 py-2 text-sm">
            Of course! What would you like to work on?
          </div>
        </div>
      </div>

      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Type a message..."
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            disabled={editMode}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || editMode}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Project: {projectId}
        </div>
      </div>
    </div>
  )
}
