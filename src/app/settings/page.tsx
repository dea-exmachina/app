'use client'

import { useTheme } from 'next-themes'
import { APP_VERSION } from '@/lib/version'
import { useCallback, useEffect, useState } from 'react'
import { SectionDivider } from '@/components/ui/section-divider'
import { useAccentColor, ACCENT_PRESETS } from '@/hooks/useAccentColor'
import { useTextSize } from '@/hooks/useTextSize'

interface RoutingRule {
  task_type: string
  default_model: string
  is_governance: boolean
  description: string | null
}

const MODEL_OPTIONS = [
  { value: 'gemini-3-pro', label: 'Gemini 3 Pro' },
  { value: 'gemini-3-flash', label: 'Gemini 3 Flash' },
  { value: 'claude-opus-4.5', label: 'Claude Opus 4.5' },
  { value: 'claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
]

const CLAUDE_MODELS = MODEL_OPTIONS.filter((m) => m.value.startsWith('claude'))

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
  const [routingRules, setRoutingRules] = useState<RoutingRule[]>([])
  const [routingSaved, setRoutingSaved] = useState<string | null>(null)
  const [autoFlagEnabled, setAutoFlagEnabled] = useState(true)
  const [autoFlagSaved, setAutoFlagSaved] = useState<string | null>(null)
  const [deliverablesPath, setDeliverablesPath] = useState('')
  const [discordWebhook, setDiscordWebhook] = useState('')
  const [settingsSaved, setSettingsSaved] = useState<Record<string, string>>({})

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    fetch('/api/routing/config')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setRoutingRules(data) })
      .catch(() => {})

    fetch('/api/settings?key=auto_flag_on_review')
      .then((r) => r.json())
      .then((data) => {
        if (data.value !== null && data.value !== undefined) {
          setAutoFlagEnabled(data.value.enabled ?? true)
        }
      })
      .catch(() => {})

    // Load user settings
    fetch('/api/user-settings')
      .then((r) => r.json())
      .then((json) => {
        const settings = json.data ?? []
        for (const s of settings) {
          if (s.key === 'deliverables_path') setDeliverablesPath(typeof s.value === 'string' ? s.value : '')
          if (s.key === 'discord_webhook') setDiscordWebhook(typeof s.value === 'string' ? s.value : '')
        }
      })
      .catch(() => {})
  }, [])

  const handleModelChange = useCallback(async (taskType: string, model: string) => {
    setRoutingRules((prev) =>
      prev.map((r) => (r.task_type === taskType ? { ...r, default_model: model } : r))
    )
    setRoutingSaved(null)
    try {
      const res = await fetch('/api/routing/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_type: taskType, default_model: model }),
      })
      if (res.ok) {
        setRoutingSaved(taskType)
        setTimeout(() => setRoutingSaved(null), 2000)
      } else {
        const err = await res.json()
        setRoutingSaved(`error:${err.error}`)
        setTimeout(() => setRoutingSaved(null), 3000)
      }
    } catch {
      setRoutingSaved('error:Network error')
      setTimeout(() => setRoutingSaved(null), 3000)
    }
  }, [])

  const handleAutoFlagToggle = useCallback(async () => {
    const newValue = !autoFlagEnabled
    setAutoFlagEnabled(newValue)
    setAutoFlagSaved(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'auto_flag_on_review',
          value: { enabled: newValue },
          description: 'Auto-flag cards for release when moved to review lane',
        }),
      })
      if (res.ok) {
        setAutoFlagSaved('saved')
        setTimeout(() => setAutoFlagSaved(null), 2000)
      } else {
        setAutoFlagEnabled(!newValue)
        setAutoFlagSaved('error')
        setTimeout(() => setAutoFlagSaved(null), 3000)
      }
    } catch {
      setAutoFlagEnabled(!newValue)
      setAutoFlagSaved('error')
      setTimeout(() => setAutoFlagSaved(null), 3000)
    }
  }, [autoFlagEnabled])

  const saveUserSetting = useCallback(async (key: string, value: unknown, category = 'general') => {
    setSettingsSaved((prev) => ({ ...prev, [key]: 'saving' }))
    try {
      const res = await fetch('/api/user-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, category }),
      })
      if (res.ok) {
        setSettingsSaved((prev) => ({ ...prev, [key]: 'saved' }))
        setTimeout(() => setSettingsSaved((prev) => ({ ...prev, [key]: '' })), 2000)
      } else {
        setSettingsSaved((prev) => ({ ...prev, [key]: 'error' }))
        setTimeout(() => setSettingsSaved((prev) => ({ ...prev, [key]: '' })), 3000)
      }
    } catch {
      setSettingsSaved((prev) => ({ ...prev, [key]: 'error' }))
      setTimeout(() => setSettingsSaved((prev) => ({ ...prev, [key]: '' })), 3000)
    }
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

      {/* Release */}
      <div>
        <SectionDivider label="Release" />
        <p className="mt-2 mb-3 font-mono text-[11px] text-terminal-fg-secondary">
          Controls how cards are flagged for production release.
        </p>
        <div className="flex items-center justify-between border-b border-terminal-border py-2">
          <div className="flex-1">
            <span className="font-mono text-[11px] text-terminal-fg-primary">
              Auto-flag on review
            </span>
            <p className="font-mono text-[10px] text-terminal-fg-tertiary mt-0.5">
              Automatically flag cards for release when moved to the review lane. Un-flag cards that don&apos;t pass testing.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {autoFlagSaved === 'saved' && (
              <span className="font-mono text-[9px] text-status-ok">saved</span>
            )}
            {autoFlagSaved === 'error' && (
              <span className="font-mono text-[9px] text-status-error">error</span>
            )}
            <button
              onClick={handleAutoFlagToggle}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                autoFlagEnabled
                  ? 'bg-user-accent'
                  : 'bg-terminal-border-strong'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  autoFlagEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Paths */}
      <div>
        <SectionDivider label="Paths" />
        <p className="mt-2 mb-3 font-mono text-[11px] text-terminal-fg-secondary">
          Default paths for bender deliverables and artifact storage.
        </p>
        <div className="flex items-center gap-3 border-b border-terminal-border py-2">
          <label className="font-mono text-[11px] text-terminal-fg-primary w-32 shrink-0">
            Deliverables path
          </label>
          <input
            type="text"
            value={deliverablesPath}
            onChange={(e) => setDeliverablesPath(e.target.value)}
            onBlur={() => saveUserSetting('deliverables_path', deliverablesPath, 'paths')}
            placeholder="e.g. D:\dev\benders\deliverables"
            className="flex-1 bg-terminal-bg-elevated border border-terminal-border rounded-sm px-2 py-1 font-mono text-[11px] text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent"
          />
          {settingsSaved.deliverables_path === 'saved' && (
            <span className="font-mono text-[9px] text-status-ok shrink-0">saved</span>
          )}
          {settingsSaved.deliverables_path === 'error' && (
            <span className="font-mono text-[9px] text-status-error shrink-0">error</span>
          )}
        </div>
      </div>

      {/* Integrations */}
      <div>
        <SectionDivider label="Integrations" />
        <p className="mt-2 mb-3 font-mono text-[11px] text-terminal-fg-secondary">
          Webhook URLs and external service connections.
        </p>
        <div className="flex items-center gap-3 border-b border-terminal-border py-2">
          <label className="font-mono text-[11px] text-terminal-fg-primary w-32 shrink-0">
            Discord webhook
          </label>
          <input
            type="text"
            value={discordWebhook}
            onChange={(e) => setDiscordWebhook(e.target.value)}
            onBlur={() => saveUserSetting('discord_webhook', discordWebhook, 'integrations')}
            placeholder="https://discord.com/api/webhooks/..."
            className="flex-1 bg-terminal-bg-elevated border border-terminal-border rounded-sm px-2 py-1 font-mono text-[11px] text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent"
          />
          {settingsSaved.discord_webhook === 'saved' && (
            <span className="font-mono text-[9px] text-status-ok shrink-0">saved</span>
          )}
          {settingsSaved.discord_webhook === 'error' && (
            <span className="font-mono text-[9px] text-status-error shrink-0">error</span>
          )}
        </div>
      </div>

      {/* Model Routing */}
      <div>
        <SectionDivider label="Model Routing" />
        <p className="mt-2 mb-3 font-mono text-[11px] text-terminal-fg-secondary">
          Default model assignment per task type. Governance tasks require Claude.
        </p>
        {routingRules.length === 0 ? (
          <div className="font-mono text-[11px] text-terminal-fg-tertiary">Loading routing rules...</div>
        ) : (
          <div className="space-y-0">
            <div className="flex items-center gap-3 border-b border-terminal-border pb-1.5 mb-1">
              <span className="font-mono text-[10px] text-terminal-fg-tertiary uppercase tracking-wider w-28 shrink-0">Type</span>
              <span className="font-mono text-[10px] text-terminal-fg-tertiary uppercase tracking-wider flex-1">Description</span>
              <span className="font-mono text-[10px] text-terminal-fg-tertiary uppercase tracking-wider w-40 shrink-0 text-right">Model</span>
            </div>
            {routingRules.map((rule) => (
              <div
                key={rule.task_type}
                className="flex items-center gap-3 border-b border-terminal-border py-1.5"
              >
                <span className="font-mono text-[11px] text-terminal-fg-primary w-28 shrink-0 flex items-center gap-1.5">
                  {rule.task_type}
                  {rule.is_governance && (
                    <span className="text-[9px] text-status-warn border border-status-warn/30 px-1 rounded-sm">GOV</span>
                  )}
                </span>
                <span className="font-mono text-[10px] text-terminal-fg-tertiary flex-1 truncate">
                  {rule.description}
                </span>
                <div className="w-40 shrink-0 flex items-center justify-end gap-1.5">
                  {routingSaved === rule.task_type && (
                    <span className="text-[9px] text-status-ok">saved</span>
                  )}
                  {routingSaved?.startsWith('error:') && (
                    <span className="text-[9px] text-status-error truncate max-w-20">
                      {routingSaved.slice(6)}
                    </span>
                  )}
                  <select
                    value={rule.default_model}
                    onChange={(e) => handleModelChange(rule.task_type, e.target.value)}
                    className="bg-terminal-bg border border-terminal-border rounded-sm px-2 py-0.5 font-mono text-[10px] text-terminal-fg-primary cursor-pointer hover:border-terminal-border-strong transition-colors"
                  >
                    {(rule.is_governance ? CLAUDE_MODELS : MODEL_OPTIONS).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
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
            <span className="text-terminal-fg-tertiary">v{APP_VERSION}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
