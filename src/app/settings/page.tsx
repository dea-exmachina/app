'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { SectionDivider } from '@/components/ui/section-divider'
import { useAccentColor, ACCENT_PRESETS } from '@/hooks/useAccentColor'
import { useTextSize } from '@/hooks/useTextSize'

const LAYOUT_PAGES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'kanban', label: 'Kanban' },
  { id: 'benders', label: 'Benders' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'projects', label: 'Projects' },
  { id: 'skills', label: 'Skills' },
  { id: 'workflows', label: 'Workflows' },
]

/** Preview color for an accent preset (for the swatch) */
function previewColor(hue: number, chroma: number) {
  return `oklch(0.65 ${chroma} ${hue})`
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { activePreset, setAccent, mounted: accentMounted } = useAccentColor()
  const { size: textSize, setTextSize, mounted: textMounted, MIN_SIZE, MAX_SIZE, STEP } = useTextSize()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleResetLayout = (pageId: string) => {
    localStorage.removeItem(`cc-layout-${pageId}`)
  }

  const handleResetAllLayouts = () => {
    LAYOUT_PAGES.forEach((p) => localStorage.removeItem(`cc-layout-${p.id}`))
  }

  if (!mounted || !accentMounted || !textMounted) {
    return (
      <div className="p-4">
        <div className="font-mono text-[11px] text-terminal-fg-tertiary">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6 p-4">
      <h1 className="font-mono text-[13px] font-semibold uppercase tracking-wider text-terminal-fg-primary">
        Settings
      </h1>

      {/* Theme */}
      <div>
        <SectionDivider label="Theme" />
        <div className="mt-3 flex gap-2">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`rounded-sm border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors ${
                theme === t
                  ? 'border-user-accent bg-user-accent-muted text-terminal-fg-primary'
                  : 'border-terminal-border text-terminal-fg-secondary hover:border-terminal-border-strong hover:text-terminal-fg-primary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div>
        <SectionDivider label="Accent Color" />
        <div className="mt-3 flex flex-wrap gap-3">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => setAccent(preset.name)}
              className={`flex items-center gap-2 rounded-sm border px-3 py-1.5 font-mono text-[11px] transition-colors ${
                activePreset === preset.name
                  ? 'border-user-accent bg-user-accent-muted text-terminal-fg-primary'
                  : 'border-terminal-border text-terminal-fg-secondary hover:border-terminal-border-strong hover:text-terminal-fg-primary'
              }`}
            >
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: previewColor(preset.hue, preset.chroma) }}
              />
              {preset.label}
            </button>
          ))}
        </div>
        <p className="mt-2 font-mono text-[10px] text-terminal-fg-tertiary">
          Accent color applies to active states, focus rings, and interactive elements.
        </p>
      </div>

      {/* Text Size */}
      <div>
        <SectionDivider label="Text Size" />
        <div className="mt-3 flex items-center gap-4">
          <span className="font-mono text-[11px] text-terminal-fg-tertiary w-6 text-right shrink-0">
            A
          </span>
          <input
            type="range"
            min={MIN_SIZE}
            max={MAX_SIZE}
            step={STEP}
            value={textSize}
            onChange={(e) => setTextSize(parseInt(e.target.value, 10))}
            className="flex-1 h-1 accent-[var(--user-accent)] cursor-pointer"
          />
          <span className="font-mono text-[14px] text-terminal-fg-tertiary w-6 shrink-0">
            A
          </span>
          <span className="font-mono text-[11px] text-terminal-fg-secondary w-10 text-right shrink-0">
            {textSize}%
          </span>
        </div>
        <p className="mt-2 font-mono text-[10px] text-terminal-fg-tertiary">
          Scales all text across the interface. Default: 100%.
        </p>
      </div>

      {/* Layout Resets */}
      <div>
        <SectionDivider label="Widget Layouts" />
        <p className="mt-2 mb-3 font-mono text-[11px] text-terminal-fg-secondary">
          Reset widget grid layouts to defaults. Use EDIT mode on each page to drag, resize, and rearrange widgets.
        </p>
        <div className="space-y-1.5">
          {LAYOUT_PAGES.map((page) => (
            <div
              key={page.id}
              className="flex items-center justify-between border-b border-terminal-border py-1.5"
            >
              <span className="font-mono text-[11px] text-terminal-fg-primary">{page.label}</span>
              <button
                onClick={() => handleResetLayout(page.id)}
                className="font-mono text-[10px] text-terminal-fg-tertiary hover:text-status-warn transition-colors uppercase tracking-wider"
              >
                Reset
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={handleResetAllLayouts}
          className="mt-3 rounded-sm border border-terminal-border px-3 py-1.5 font-mono text-[10px] text-terminal-fg-tertiary hover:border-status-warn hover:text-status-warn transition-colors uppercase tracking-wider"
        >
          Reset All Layouts
        </button>
      </div>

      {/* Data */}
      <div>
        <SectionDivider label="Data" />
        <div className="mt-3 space-y-2 font-mono text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-terminal-fg-secondary">Backend</span>
            <span className="text-terminal-fg-primary">Supabase</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-terminal-fg-secondary">Version</span>
            <span className="text-terminal-fg-tertiary">v0.1.0</span>
          </div>
        </div>
      </div>
    </div>
  )
}
