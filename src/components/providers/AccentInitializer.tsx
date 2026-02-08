'use client'

import { useEffect } from 'react'
import { ACCENT_PRESETS } from '@/hooks/useAccentColor'

const STORAGE_KEY = 'cc-accent-color'

/**
 * Reads saved accent from localStorage on mount and applies CSS variables.
 * Runs once at app startup — no state, no re-renders.
 */
export function AccentInitializer() {
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    const preset = ACCENT_PRESETS.find((p) => p.name === saved)
    if (!preset) return

    const root = document.documentElement
    const isDark = root.classList.contains('dark')
    const lightness = isDark ? 0.65 : 0.6
    const base = `oklch(${lightness} ${preset.chroma} ${preset.hue})`
    const muted = `oklch(${lightness} ${preset.chroma} ${preset.hue} / 15%)`

    root.style.setProperty('--user-accent', base)
    root.style.setProperty('--user-accent-muted', muted)
  }, [])

  return null
}
