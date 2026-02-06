'use client'

import { useState, useEffect } from 'react'
import type { BenderPlatform } from '@/types/bender'
import { getPlatforms } from '@/lib/client/api'

export function useBenders() {
  const [data, setData] = useState<BenderPlatform[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPlatforms()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}
