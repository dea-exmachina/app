'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Layers,
  FolderOpen,
  PenTool,
  Zap,
  Workflow,
  Bot,
  Inbox,
  MessageCircle,
  Crown,
  Network,
  Search,
  Settings,
  Calendar,
} from 'lucide-react'
import { useAgentHealth } from '@/hooks/useAgentHealth'
import { AgentRosterItem } from './AgentRosterItem'
import { SystemPulse } from './SystemPulse'
import { ThemeToggle } from './ThemeToggle'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/kanban/unified', label: 'Kanban', icon: Layers },
  { href: '/kanban/sprints', label: 'Sprints', icon: Calendar },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/canvas', label: 'Canvas', icon: PenTool },
  { href: '/skills', label: 'Skills', icon: Zap },
  { href: '/workflows', label: 'Workflows', icon: Workflow },
  { href: '/benders', label: 'Benders', icon: Bot },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/creep/events', label: 'CREEP', icon: Crown },
  { href: '/architecture', label: 'Architecture', icon: Network },
  { href: '/research', label: 'Research', icon: Search },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { agents } = useAgentHealth({ pollInterval: 30000 })

  const visibleAgents = agents.slice(0, 5)
  const hasMore = agents.length > 5

  return (
    <aside className="flex h-screen w-52 flex-col border-r border-terminal-border bg-terminal-bg-surface">
      {/* Logo + theme toggle */}
      <div className="flex h-11 items-center justify-between border-b border-terminal-border px-3">
        <Link href="/" className="font-mono text-xs font-semibold tracking-wide text-terminal-fg-primary">
          dea<span className="text-terminal-fg-tertiary">::</span>control
        </Link>
        <ThemeToggle />
      </div>

      {/* System pulse */}
      <div className="border-b border-terminal-border px-3 py-1.5">
        <SystemPulse />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <p className="terminal-section mb-1.5 mx-1">Nav</p>
        <div className="space-y-px">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)

            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-sm px-2 py-1.5 font-mono text-[11px] transition-colors ${
                  isActive
                    ? 'bg-user-accent-muted text-terminal-fg-primary'
                    : 'text-terminal-fg-secondary hover:bg-terminal-bg-elevated hover:text-terminal-fg-primary'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
                {isActive && (
                  <span className="ml-auto text-user-accent text-[10px]">{'>'}</span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Agent roster */}
      <div className="border-t border-terminal-border">
        <div className="px-2 py-2">
          <p className="terminal-section mb-1.5 mx-1">Agents</p>
          <div className="space-y-px">
            {visibleAgents.map((agent) => (
              <AgentRosterItem
                key={agent.id}
                agent={agent}
                onClick={() => router.push('/creep/agents')}
              />
            ))}
            {hasMore && (
              <Link
                href="/creep/agents"
                className="block px-2 py-1 font-mono text-[10px] text-terminal-fg-tertiary hover:text-terminal-fg-secondary transition-colors"
              >
                +{agents.length - 5} more
              </Link>
            )}
            {agents.length === 0 && (
              <p className="px-2 py-1 font-mono text-[10px] text-terminal-fg-tertiary">
                No agents
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Settings — pinned bottom */}
      <div className="border-t border-terminal-border px-2 py-1.5">
        <Link
          href="/settings"
          className={`flex items-center gap-2 rounded-sm px-2 py-1.5 font-mono text-[11px] transition-colors ${
            pathname.startsWith('/settings')
              ? 'bg-user-accent-muted text-terminal-fg-primary'
              : 'text-terminal-fg-secondary hover:bg-terminal-bg-elevated hover:text-terminal-fg-primary'
          }`}
        >
          <Settings className="h-3.5 w-3.5 shrink-0" />
          Settings
          {pathname.startsWith('/settings') && (
            <span className="ml-auto text-user-accent text-[10px]">{'>'}</span>
          )}
        </Link>
      </div>

      {/* Footer */}
      <div className="border-t border-terminal-border px-3 py-2">
        <p className="font-mono text-[9px] text-terminal-fg-tertiary">v0.1.0 · supabase</p>
      </div>
    </aside>
  )
}
