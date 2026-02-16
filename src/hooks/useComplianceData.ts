'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ComplianceData } from '@/app/creep/compliance/types'
import { getMockComplianceData } from '@/app/creep/compliance/data'

interface UseComplianceDataResult {
  data: ComplianceData | null
  loading: boolean
  error: string | null
  refresh: () => void
  lastUpdated: Date | null
}

/**
 * Hook for compliance scorecard data.
 * Currently returns mock data; swap to Supabase fetch when table exists.
 */
export function useComplianceData(): UseComplianceDataResult {
  const [data, setData] = useState<ComplianceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true)
    setError(null)

    try {
      // Mock: simulate async data fetch with small delay
      await new Promise((resolve) => setTimeout(resolve, 300))
      const result = getMockComplianceData()
      setData(result)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load compliance data')
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchData(true)
  }, [fetchData])

  const refresh = useCallback(() => {
    fetchData(true)
  }, [fetchData])

  return { data, loading, error, refresh, lastUpdated }
}
