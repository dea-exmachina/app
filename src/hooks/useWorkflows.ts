'use client'

import { useState, useEffect } from 'react'
import type { Workflow } from '@/types/workflow'
import { getWorkflows } from '@/lib/client/api'

export function useWorkflows() {
  const [data, setData] = useState<Workflow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getWorkflows()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}
