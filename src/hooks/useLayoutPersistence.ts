'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Layout, Layouts } from '@/types/widget'

export function useLayoutPersistence(pageId: string, defaultLayouts: Layouts) {
  const [layouts, setLayouts] = useState<Layouts>(defaultLayouts)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load saved layouts on mount
  useEffect(() => {
    const saved = localStorage.getItem(`cc-layout-${pageId}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setLayouts(parsed)
      } catch {
        // Ignore invalid JSON
      }
    }
  }, [pageId])

  // Save on layout change (debounced)
  const onLayoutChange = useCallback(
    (_currentLayout: Layout, allLayouts: Layouts) => {
      setLayouts(allLayouts)

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        localStorage.setItem(`cc-layout-${pageId}`, JSON.stringify(allLayouts))
      }, 500)
    },
    [pageId]
  )

  // Reset function
  const resetLayout = useCallback(() => {
    localStorage.removeItem(`cc-layout-${pageId}`)
    setLayouts(defaultLayouts)
  }, [pageId, defaultLayouts])

  return { layouts, onLayoutChange, resetLayout }
}
