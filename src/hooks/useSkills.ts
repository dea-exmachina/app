'use client'

import { useState, useEffect } from 'react'
import type { Skill } from '@/types/skill'
import { getSkills } from '@/lib/client/api'

export function useSkills() {
  const [data, setData] = useState<Skill[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getSkills()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}
