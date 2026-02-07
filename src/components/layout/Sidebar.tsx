'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Columns3,
  FolderOpen,
  PenTool,
  Zap,
  Workflow,
  Bot,
  Inbox,
  MessageCircle,
  Crown,
  Network,
} from 'lucide-react'
import { useAgentHealth } from '@/hooks/useAgentHealth'
import { AgentRosterItem } from './AgentRosterItem'
import { SystemPulse } from './SystemPulse'
import { ThemeToggle } from './ThemeToggle'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/kanban', label: 'Kanban', icon: Columns3 },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/canvas', label: 'Canvas', icon: PenTool },
  { href: '/skills', label: 'Skills', icon: Zap },
  { href: '/workflows', label: 'Workflows', icon: Workflow },
  { href: '/benders', label: 'Benders', icon: Bot },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/queen/events', label: 'QUEEN', icon: Crown },
  { href: '/architecture', label: 'Architecture', icon: Network },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { agents } = useAgentHealth({ pollInterval: 30000 })

  // Only show first 5 agents in roster
  const visibleAgents = agents.slice(0, 5)
  const hasMore = agents.length > 5

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-card">
      {/* Header with logo, theme toggle */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <Link href="/" className="font-mono text-sm font-semibold tracking-wide text-accent-foreground">
          dea<span className="text-muted-foreground">::</span>control
        </Link>
        <ThemeToggle />
      </div>

      {/* System pulse indicator */}
      <div className="border-b border-border px-3 py-2">
        <SystemPulse />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
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
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-mono transition-colors ${
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Agent roster */}
      <div className="border-t border-border">
        <div className="px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Agents
          </p>
          <div className="space-y-0.5">
            {visibleAgents.map((agent) => (
              <AgentRosterItem
                key={agent.id}
                agent={agent}
                onClick={() => router.push('/queen/agents')}
              />
            ))}
            {hasMore && (
              <Link
                href="/queen/agents"
                className="block px-2 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                +{agents.length - 5} more...
              </Link>
            )}
            {agents.length === 0 && (
              <p className="px-2 py-1 font-mono text-[10px] text-muted-foreground">
                No agents
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <div className="rounded-md bg-muted/50 px-3 py-2">
          <p className="font-mono text-xs text-muted-foreground">v0.1.0</p>
          <p className="font-mono text-xs text-muted-foreground">data: supabase</p>
        </div>
      </div>
    </aside>
  )
}
