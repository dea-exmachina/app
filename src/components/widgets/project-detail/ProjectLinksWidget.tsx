'use client'

import { useState } from 'react'
import { useProjectDashboardContext } from './ProjectDashboardProvider'
import type { ProjectLink } from '@/types/project'

const TYPE_ICONS: Record<ProjectLink['type'], string> = {
  folder: '\u{1F4C1}',
  file: '\u{1F4C4}',
  url: '\u{1F517}',
}

function detectType(url: string): ProjectLink['type'] {
  if (/^https?:\/\//i.test(url)) return 'url'
  if (/\.\w{1,10}$/.test(url)) return 'file'
  return 'folder'
}

function toHref(link: ProjectLink): string {
  if (link.type === 'url') return link.url
  // Local paths: convert backslashes and use file:/// protocol
  const normalized = link.url.replace(/\\/g, '/')
  return `file:///${normalized.replace(/^\//, '')}`
}

export function ProjectLinksWidget() {
  const { data, saveLinks } = useProjectDashboardContext()
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const handleAdd = () => {
    const trimLabel = label.trim()
    const trimUrl = url.trim()
    if (!trimUrl) return

    const newLink: ProjectLink = {
      id: crypto.randomUUID(),
      label: trimLabel || trimUrl.split(/[\\/]/).pop() || trimUrl,
      url: trimUrl,
      type: detectType(trimUrl),
    }

    saveLinks([...data.links, newLink])
    setLabel('')
    setUrl('')
  }

  const handleDelete = (id: string) => {
    saveLinks(data.links.filter((l) => l.id !== id))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Link list */}
      <div className="flex-1 overflow-auto space-y-0.5">
        {data.links.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs font-mono text-terminal-fg-tertiary">
            No links yet
          </div>
        ) : (
          data.links.map((link) => (
            <div
              key={link.id}
              className="group flex items-center gap-2 px-2 py-1 rounded hover:bg-terminal-bg-elevated transition-colors"
              onMouseEnter={() => setHoveredId(link.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <span className="text-xs shrink-0" title={link.type}>
                {TYPE_ICONS[link.type]}
              </span>
              <a
                href={toHref(link)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0 text-xs font-mono text-user-accent hover:underline truncate"
                title={link.url}
              >
                {link.label}
              </a>
              {hoveredId === link.id && (
                <button
                  onClick={() => handleDelete(link.id)}
                  className="shrink-0 text-xs text-terminal-fg-tertiary hover:text-destructive transition-colors"
                  title="Remove link"
                >
                  x
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add form */}
      <div className="border-t border-terminal-border pt-2 mt-2 space-y-1.5">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (optional)"
          className="w-full px-2 py-1 text-xs font-mono bg-terminal-bg-elevated border border-terminal-border rounded text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent"
        />
        <div className="flex gap-1.5">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Path or URL..."
            className="flex-1 min-w-0 px-2 py-1 text-xs font-mono bg-terminal-bg-elevated border border-terminal-border rounded text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent"
          />
          <button
            onClick={handleAdd}
            disabled={!url.trim()}
            className="shrink-0 px-2 py-1 text-xs font-mono bg-terminal-bg-elevated border border-terminal-border rounded text-terminal-fg-primary hover:border-user-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
