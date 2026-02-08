'use client'

import { useState, useEffect, useCallback } from 'react'

export interface AccentPreset {
  name: string
  label: string
  hue: number
  chroma: number
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { name: 'blue', label: 'Blue', hue: 260, chroma: 0.19 },
  { name: 'violet', label: 'Violet', hue: 295, chroma: 0.18 },
  { name: 'emerald', label: 'Emerald', hue: 160, chroma: 0.17 },
  { name: 'amber', label: 'Amber', hue: 85, chroma: 0.18 },
  { name: 'rose', label: 'Rose', hue: 15, chroma: 0.2 },
  { name: 'cyan', label: 'Cyan', hue: 210, chroma: 0.15 },
]

const STORAGE_KEY = 'cc-accent-color'
const DEFAULT_PRESET = 'blue'

function applyAccent(hue: number, chroma: number) {
  const root = document.documentElement
  const isDark = root.classList.contains('dark')

  const lightness = isDark ? 0.65 : 0.6
  const base = `oklch(${lightness} ${chroma} ${hue})`
  const muted = `oklch(${lightness} ${chroma} ${hue} / 15%)`

  root.style.setProperty('--user-accent', base)
  root.style.setProperty('--user-accent-muted', muted)
}

export function useAccentColor() {
  const [activePreset, setActivePreset] = useState(DEFAULT_PRESET)
  const [mounted, setMounted] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const preset = ACCENT_PRESETS.find((p) => p.name === saved)
      if (preset) {
        setActivePreset(saved)
        applyAccent(preset.hue, preset.chroma)
      }
    }
    setMounted(true)
  }, [])

  // Re-apply on theme change (lightness differs between dark/light)
  useEffect(() => {
    if (!mounted) return
    const observer = new MutationObserver(() => {
      const preset = ACCENT_PRESETS.find((p) => p.name === activePreset)
      if (preset) applyAccent(preset.hue, preset.chroma)
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [mounted, activePreset])

  const setAccent = useCallback((presetName: string) => {
    const preset = ACCENT_PRESETS.find((p) => p.name === presetName)
    if (!preset) return
    setActivePreset(presetName)
    localStorage.setItem(STORAGE_KEY, presetName)
    applyAccent(preset.hue, preset.chroma)
  }, [])

  return { activePreset, setAccent, presets: ACCENT_PRESETS, mounted }
}
