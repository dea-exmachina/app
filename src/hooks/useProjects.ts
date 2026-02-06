'use client'

import { useState, useEffect } from 'react'
import type { ProjectLegacy as Project } from '@/types/project'
import { getProjects } from '@/lib/client/api'

export function useProjects() {
  const [data, setData] = useState<Project[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getProjects()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}
