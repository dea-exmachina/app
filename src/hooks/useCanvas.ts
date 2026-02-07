'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Canvas, UpdateCanvasInput } from '@/types/canvas'
import { getCanvas, updateCanvas as apiUpdateCanvas } from '@/lib/client/api'

export function useCanvas(canvasId: string) {
  const [data, setData] = useState<Canvas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchCanvas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getCanvas(canvasId)
      setData(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load canvas')
    } finally {
      setLoading(false)
    }
  }, [canvasId])

  useEffect(() => {
    fetchCanvas()
  }, [fetchCanvas])

  const updateCanvas = useCallback(
    async (input: UpdateCanvasInput) => {
      setSaving(true)
      try {
        const res = await apiUpdateCanvas(canvasId, input)
        setData(res.data)
        return res.data
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save canvas')
        throw err
      } finally {
        setSaving(false)
      }
    },
    [canvasId]
  )

  return {
    data,
    loading,
    error,
    saving,
    refetch: fetchCanvas,
    updateCanvas,
  }
}
