'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_PREFIX = 'cc-visible-widgets-'

/**
 * Manages which widgets are visible on a given page.
 * Default: all widgets visible. Stores overrides in localStorage.
 */
export function useWidgetVisibility(pageId: string, allWidgetIds: string[]) {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set(allWidgetIds))
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}${pageId}`)
    if (saved) {
      try {
        const parsed: string[] = JSON.parse(saved)
        // Only keep IDs that actually exist in the config
        const valid = parsed.filter((id) => allWidgetIds.includes(id))
        setVisibleIds(new Set(valid))
      } catch {
        // Ignore
      }
    }
    setLoaded(true)
  }, [pageId, allWidgetIds])

  const persist = useCallback(
    (ids: Set<string>) => {
      localStorage.setItem(`${STORAGE_PREFIX}${pageId}`, JSON.stringify([...ids]))
    },
    [pageId]
  )

  const toggleWidget = useCallback(
    (widgetId: string) => {
      setVisibleIds((prev) => {
        const next = new Set(prev)
        if (next.has(widgetId)) {
          next.delete(widgetId)
        } else {
          next.add(widgetId)
        }
        persist(next)
        return next
      })
    },
    [persist]
  )

  const showAll = useCallback(() => {
    const all = new Set(allWidgetIds)
    setVisibleIds(all)
    persist(all)
  }, [allWidgetIds, persist])

  return { visibleIds, toggleWidget, showAll, loaded }
}
