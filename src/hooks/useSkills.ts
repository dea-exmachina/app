'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Skill } from '@/types/skill'
import { getSkills } from '@/lib/client/api'

export function useSkills() {
  const [data, setData] = useState<Skill[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    getSkills()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Derive last synced from the most recent updated_at across all skills
  const lastSynced = useMemo(() => {
    if (!data || data.length === 0) return null
    const timestamps = data
      .map((s) => s.updated_at)
      .filter((t): t is string => !!t)
    if (timestamps.length === 0) return null
    return timestamps.reduce((a, b) => (a > b ? a : b))
  }, [data])

  return { data, loading, error, refresh, lastSynced }
}
