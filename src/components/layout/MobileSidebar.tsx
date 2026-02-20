'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Menu,
  X,
  LayoutDashboard,
  Layers,
  FolderOpen,
  Zap,
  Workflow,
  Bot,
  Inbox,
  MessageCircle,
  Search,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/kanban/unified', label: 'Kanban', icon: Layers },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/skills', label: 'Skills', icon: Zap },
  { href: '/workflows', label: 'Workflows', icon: Workflow },
  { href: '/benders', label: 'Benders', icon: Bot },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/research', label: 'Research', icon: Search },
]

export function MobileSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-full flex-col border-r border-border bg-card">
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <Link
              href="/"
              className="font-mono text-sm font-semibold tracking-wide text-accent-foreground"
              onClick={() => setOpen(false)}
            >
              dea<span className="text-muted-foreground">::</span>control
            </Link>
          </div>

          <nav className="flex-1 space-y-1 p-3">
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
                  onClick={() => setOpen(false)}
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

          <div className="border-t border-border p-3">
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="font-mono text-xs text-muted-foreground">v0.1.1</p>
              <p className="font-mono text-xs text-muted-foreground">
                data: github
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
