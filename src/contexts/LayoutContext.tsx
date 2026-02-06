'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface LayoutContextValue {
  editMode: boolean
  toggleEditMode: () => void
  resetLayout: (pageId: string) => void
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined)

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [editMode, setEditMode] = useState(false)

  const toggleEditMode = useCallback(() => {
    setEditMode((prev) => !prev)
  }, [])

  const resetLayout = useCallback((pageId: string) => {
    localStorage.removeItem(`cc-layout-${pageId}`)
    window.location.reload()
  }, [])

  return (
    <LayoutContext.Provider value={{ editMode, toggleEditMode, resetLayout }}>
      {children}
    </LayoutContext.Provider>
  )
}

export function useLayout() {
  const context = useContext(LayoutContext)
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}
