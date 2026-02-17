'use client'

import { useState, useEffect, useCallback } from 'react'
import { useProjectDashboardContext } from './ProjectDashboardProvider'
import { getTechStack, createTechStackItem, deleteTechStackItem } from '@/lib/client/api'
import type { TechStackItem, TechCategory } from '@/types/techstack'

const CATEGORY_COLORS: Record<TechCategory, string> = {
  framework: 'text-blue-400',
  language: 'text-purple-400',
  database: 'text-green-400',
  hosting: 'text-amber-400',
  library: 'text-cyan-400',
  tool: 'text-orange-400',
  service: 'text-pink-400',
  other: 'text-terminal-fg-secondary',
}

const CATEGORIES: TechCategory[] = [
  'framework', 'language', 'database', 'hosting', 'library', 'tool', 'service', 'other',
]

export function ProjectTechStackWidget() {
  const { data } = useProjectDashboardContext()
  const slug = data.project.slug
  const [items, setItems] = useState<TechStackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [version, setVersion] = useState('')
  const [category, setCategory] = useState<TechCategory>('library')
  const [role, setRole] = useState('')

  const fetchItems = useCallback(async () => {
    try {
      const res = await getTechStack(slug)
      setItems(res.data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { fetchItems() }, [fetchItems])

  const handleAdd = async () => {
    const trimName = name.trim()
    if (!trimName) return
    try {
      await createTechStackItem(slug, {
        name: trimName,
        version: version.trim() || undefined,
        category,
        role: role.trim() || undefined,
      })
      setName('')
      setVersion('')
      setRole('')
      setShowForm(false)
      fetchItems()
    } catch {
      // silently fail
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteTechStackItem(slug, id)
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch {
      // silently fail
    }
  }

  // Group by category
  const grouped = items.reduce<Record<string, TechStackItem[]>>((acc, item) => {
    const cat = item.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono text-terminal-fg-tertiary">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto space-y-2">
        {items.length === 0 && !showForm ? (
          <div className="flex items-center justify-center h-full text-xs font-mono text-terminal-fg-tertiary">
            No tech stack items
          </div>
        ) : (
          Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <div className={`text-[10px] font-mono uppercase tracking-wider mb-1 ${CATEGORY_COLORS[cat as TechCategory] || 'text-terminal-fg-tertiary'}`}>
                {cat}
              </div>
              <div className="space-y-0.5">
                {catItems.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-2 px-2 py-0.5 rounded hover:bg-terminal-bg-elevated transition-colors"
                  >
                    <span className="flex-1 min-w-0 text-xs font-mono text-terminal-fg-primary truncate">
                      {item.name}
                      {item.version && (
                        <span className="text-terminal-fg-tertiary ml-1">v{item.version}</span>
                      )}
                    </span>
                    {item.role && (
                      <span className="text-[10px] font-mono text-terminal-fg-secondary truncate max-w-[100px]">
                        {item.role}
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="shrink-0 text-xs text-terminal-fg-tertiary hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add form */}
      {showForm ? (
        <div className="border-t border-terminal-border pt-2 mt-2 space-y-1.5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (required)"
            className="w-full px-2 py-1 text-xs font-mono bg-terminal-bg-elevated border border-terminal-border rounded text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent"
            autoFocus
          />
          <div className="flex gap-1.5">
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="Version"
              className="w-20 px-2 py-1 text-xs font-mono bg-terminal-bg-elevated border border-terminal-border rounded text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TechCategory)}
              className="flex-1 px-2 py-1 text-xs font-mono bg-terminal-bg-elevated border border-terminal-border rounded text-terminal-fg-primary focus:outline-none focus:border-user-accent"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role (optional)"
            className="w-full px-2 py-1 text-xs font-mono bg-terminal-bg-elevated border border-terminal-border rounded text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          />
          <div className="flex gap-1.5">
            <button
              onClick={handleAdd}
              disabled={!name.trim()}
              className="flex-1 px-2 py-1 text-xs font-mono bg-terminal-bg-elevated border border-terminal-border rounded text-terminal-fg-primary hover:border-user-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-2 py-1 text-xs font-mono text-terminal-fg-tertiary hover:text-terminal-fg-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-terminal-border pt-2 mt-2">
          <button
            onClick={() => setShowForm(true)}
            className="w-full px-2 py-1 text-xs font-mono text-terminal-fg-tertiary hover:text-terminal-fg-primary hover:bg-terminal-bg-elevated rounded transition-colors"
          >
            + Add item
          </button>
        </div>
      )}
    </div>
  )
}
