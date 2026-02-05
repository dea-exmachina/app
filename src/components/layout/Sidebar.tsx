'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: '~' },
  { href: '/kanban', label: 'Kanban', icon: '#' },
  { href: '/skills', label: 'Skills', icon: '/' },
  { href: '/workflows', label: 'Workflows', icon: '>' },
  { href: '/benders', label: 'Benders', icon: '@' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link href="/" className="font-mono text-sm font-semibold tracking-wide text-accent-foreground">
          dea<span className="text-muted-foreground">::</span>control
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)

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
              <span className="w-4 text-center opacity-60">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="rounded-md bg-muted/50 px-3 py-2">
          <p className="font-mono text-xs text-muted-foreground">v0.1.0</p>
          <p className="font-mono text-xs text-muted-foreground">data: github</p>
        </div>
      </div>
    </aside>
  )
}
