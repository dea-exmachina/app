'use client'

import { useState, useRef, useCallback } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useProjectDashboardContext } from './ProjectDashboardProvider'
import type { ChecklistItem } from '@/types/project'

export function ProjectNotesWidget() {
  const { data, saveNotes } = useProjectDashboardContext()

  return (
    <Tabs defaultValue="checklist" className="h-full flex flex-col">
      <TabsList className="shrink-0">
        <TabsTrigger value="checklist" className="font-mono text-xs">
          Checklist
        </TabsTrigger>
        <TabsTrigger value="notes" className="font-mono text-xs">
          Notes
        </TabsTrigger>
      </TabsList>
      <TabsContent value="checklist" className="flex-1 overflow-auto">
        <ChecklistTab
          items={data.notes.checklist}
          onSave={(checklist) => saveNotes({ checklist })}
        />
      </TabsContent>
      <TabsContent value="notes" className="flex-1 overflow-auto">
        <FreeformTab
          value={data.notes.freeform}
          onSave={(freeform) => saveNotes({ freeform })}
        />
      </TabsContent>
    </Tabs>
  )
}

function ChecklistTab({
  items,
  onSave,
}: {
  items: ChecklistItem[]
  onSave: (items: ChecklistItem[]) => void
}) {
  const [newText, setNewText] = useState('')

  const toggleItem = useCallback(
    (id: string) => {
      const updated = items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
      onSave(updated)
    },
    [items, onSave]
  )

  const addItem = useCallback(() => {
    const text = newText.trim()
    if (!text) return
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text,
      checked: false,
      created_at: new Date().toISOString(),
    }
    onSave([...items, newItem])
    setNewText('')
  }, [newText, items, onSave])

  const removeItem = useCallback(
    (id: string) => {
      onSave(items.filter((item) => item.id !== id))
    },
    [items, onSave]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addItem()
    }
  }

  return (
    <div className="space-y-2 pt-2">
      {/* Add item */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add item..."
          className="flex-1 bg-transparent border border-terminal-border rounded-sm px-2 py-1 font-mono text-xs text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent"
        />
        <button
          onClick={addItem}
          disabled={!newText.trim()}
          className="font-mono text-[10px] px-2 py-1 rounded-sm border border-terminal-border text-terminal-fg-tertiary hover:text-terminal-fg-secondary hover:border-user-accent disabled:opacity-30 transition-colors"
        >
          +
        </button>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="text-xs font-mono text-terminal-fg-tertiary text-center py-4">
          No items yet
        </div>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 group px-1 py-0.5 rounded-sm hover:bg-terminal-bg-elevated"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleItem(item.id)}
                className="accent-user-accent shrink-0"
              />
              <span
                className={`flex-1 font-mono text-xs ${
                  item.checked
                    ? 'line-through text-terminal-fg-tertiary'
                    : 'text-terminal-fg-primary'
                }`}
              >
                {item.text}
              </span>
              <button
                onClick={() => removeItem(item.id)}
                className="opacity-0 group-hover:opacity-100 font-mono text-[10px] text-terminal-fg-tertiary hover:text-status-error transition-opacity"
              >
                x
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FreeformTab({
  value,
  onSave,
}: {
  value: string
  onSave: (value: string) => void
}) {
  const [text, setText] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value
    setText(newVal)
    // Debounced save
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onSave(newVal)
    }, 800)
  }

  return (
    <div className="h-full pt-2">
      <textarea
        value={text}
        onChange={handleChange}
        placeholder="Quick notes..."
        className="w-full h-full min-h-[120px] resize-none bg-transparent border border-terminal-border rounded-sm px-2 py-1.5 font-mono text-xs text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent"
      />
    </div>
  )
}
