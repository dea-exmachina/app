'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'cc-text-size'
const DEFAULT_SIZE = 100 // percentage
const MIN_SIZE = 80
const MAX_SIZE = 130
const STEP = 5

function applyTextSize(pct: number) {
  document.documentElement.style.fontSize = `${pct}%`
}

export function useTextSize() {
  const [size, setSize] = useState(DEFAULT_SIZE)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const n = parseInt(saved, 10)
      if (!isNaN(n) && n >= MIN_SIZE && n <= MAX_SIZE) {
        setSize(n)
        applyTextSize(n)
      }
    }
    setMounted(true)
  }, [])

  const setTextSize = useCallback((pct: number) => {
    const clamped = Math.max(MIN_SIZE, Math.min(MAX_SIZE, pct))
    setSize(clamped)
    localStorage.setItem(STORAGE_KEY, String(clamped))
    applyTextSize(clamped)
  }, [])

  return { size, setTextSize, mounted, MIN_SIZE, MAX_SIZE, STEP }
}
