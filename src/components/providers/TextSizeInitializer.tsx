'use client'

import { useEffect } from 'react'

const STORAGE_KEY = 'cc-text-size'

/**
 * Reads saved text size from localStorage on mount and applies to :root.
 * Runs once at app startup — no state, no re-renders.
 */
export function TextSizeInitializer() {
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    const n = parseInt(saved, 10)
    if (!isNaN(n) && n >= 80 && n <= 130) {
      document.documentElement.style.fontSize = `${n}%`
    }
  }, [])

  return null
}
