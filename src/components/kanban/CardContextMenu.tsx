'use client'

import { useEffect, useRef, useCallback, type MouseEvent } from 'react'
import {
  Flag,
  FlagOff,
  ArrowRight,
  Gauge,
  ChevronRight,
  X,
} from 'lucide-react'

const LANES = ['backlog', 'ready', 'in_progress', 'review', 'done'] as const
const PRIORITIES = ['critical', 'high', 'normal', 'low'] as const

const LANE_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  ready: 'Ready',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-status-error',
  high: 'text-status-warn',
  normal: 'text-terminal-fg-primary',
  low: 'text-terminal-fg-tertiary',
}

export interface ContextMenuAction {
  type: 'flag' | 'unflag' | 'move' | 'priority' | 'clear'
  value?: string
}

interface CardContextMenuProps {
  x: number
  y: number
  cardCount: number
  /** Are all selected cards in review lane? */
  allInReview: boolean
  onAction: (action: ContextMenuAction) => void
  onClose: () => void
}

export function CardContextMenu({
  x,
  y,
  cardCount,
  allInReview,
  onAction,
  onClose,
}: CardContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const submenuTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Active submenu: 'lane' | 'priority' | null
  const submenuRef = useRef<string | null>(null)

  // Close on click outside or Escape
  useEffect(() => {
    const handleClick = (e: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Position: clamp to viewport
  const style = {
    left: Math.min(x, window.innerWidth - 220),
    top: Math.min(y, window.innerHeight - 300),
  }

  const handleAction = useCallback(
    (action: ContextMenuAction) => (e: MouseEvent) => {
      e.stopPropagation()
      onAction(action)
      onClose()
    },
    [onAction, onClose]
  )

  const showSubmenu = useCallback((name: string) => {
    if (submenuTimerRef.current) clearTimeout(submenuTimerRef.current)
    submenuRef.current = name
    // Force re-render by toggling a data attribute
    menuRef.current?.setAttribute('data-submenu', name)
  }, [])

  const hideSubmenu = useCallback(() => {
    submenuTimerRef.current = setTimeout(() => {
      submenuRef.current = null
      menuRef.current?.removeAttribute('data-submenu')
    }, 150)
  }, [])

  const keepSubmenu = useCallback(() => {
    if (submenuTimerRef.current) clearTimeout(submenuTimerRef.current)
  }, [])

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[180px] rounded-sm border border-terminal-border bg-terminal-bg-surface shadow-lg py-1 font-mono text-[11px]"
      style={style}
    >
      {/* Header */}
      <div className="px-3 py-1.5 text-[10px] text-terminal-fg-tertiary uppercase tracking-wider border-b border-terminal-border mb-1">
        {cardCount} card{cardCount !== 1 ? 's' : ''} selected
      </div>

      {/* Flag / Unflag — only shown when all selected cards are in review */}
      {allInReview && (
        <>
          <button
            onClick={handleAction({ type: 'flag' })}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-terminal-fg-primary hover:bg-terminal-bg-elevated transition-colors"
          >
            <Flag className="h-3 w-3" />
            Mark as Reviewed
          </button>
          <button
            onClick={handleAction({ type: 'unflag' })}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-terminal-fg-primary hover:bg-terminal-bg-elevated transition-colors"
          >
            <FlagOff className="h-3 w-3" />
            Mark as Pending
          </button>
          <div className="border-t border-terminal-border my-1" />
        </>
      )}

      {/* Move to Lane (submenu) */}
      <div
        className="relative"
        onMouseEnter={() => showSubmenu('lane')}
        onMouseLeave={hideSubmenu}
      >
        <button className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-terminal-fg-primary hover:bg-terminal-bg-elevated transition-colors">
          <span className="flex items-center gap-2">
            <ArrowRight className="h-3 w-3" />
            Move to Lane
          </span>
          <ChevronRight className="h-3 w-3 text-terminal-fg-tertiary" />
        </button>

        {/* Lane submenu */}
        <div
          className="absolute left-full top-0 ml-0.5 min-w-[140px] rounded-sm border border-terminal-border bg-terminal-bg-surface shadow-lg py-1 hidden group-hover:block"
          style={{ display: menuRef.current?.getAttribute('data-submenu') === 'lane' ? 'block' : 'none' }}
          onMouseEnter={keepSubmenu}
          onMouseLeave={hideSubmenu}
        >
          {LANES.map((lane) => (
            <button
              key={lane}
              onClick={handleAction({ type: 'move', value: lane })}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-terminal-fg-primary hover:bg-terminal-bg-elevated transition-colors"
            >
              {LANE_LABELS[lane]}
            </button>
          ))}
        </div>
      </div>

      {/* Set Priority (submenu) */}
      <div
        className="relative"
        onMouseEnter={() => showSubmenu('priority')}
        onMouseLeave={hideSubmenu}
      >
        <button className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-terminal-fg-primary hover:bg-terminal-bg-elevated transition-colors">
          <span className="flex items-center gap-2">
            <Gauge className="h-3 w-3" />
            Set Priority
          </span>
          <ChevronRight className="h-3 w-3 text-terminal-fg-tertiary" />
        </button>

        {/* Priority submenu */}
        <div
          className="absolute left-full top-0 ml-0.5 min-w-[120px] rounded-sm border border-terminal-border bg-terminal-bg-surface shadow-lg py-1"
          style={{ display: menuRef.current?.getAttribute('data-submenu') === 'priority' ? 'block' : 'none' }}
          onMouseEnter={keepSubmenu}
          onMouseLeave={hideSubmenu}
        >
          {PRIORITIES.map((pri) => (
            <button
              key={pri}
              onClick={handleAction({ type: 'priority', value: pri })}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-terminal-bg-elevated transition-colors uppercase ${PRIORITY_COLORS[pri]}`}
            >
              {pri}
            </button>
          ))}
        </div>
      </div>

      {/* Divider + Clear selection */}
      <div className="border-t border-terminal-border my-1" />
      <button
        onClick={handleAction({ type: 'clear' })}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-terminal-fg-tertiary hover:bg-terminal-bg-elevated hover:text-terminal-fg-primary transition-colors"
      >
        <X className="h-3 w-3" />
        Clear Selection
      </button>
    </div>
  )
}
