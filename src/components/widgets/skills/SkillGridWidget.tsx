'use client'

import { SkillGrid } from '@/components/skills/SkillGrid'
import { Skeleton } from '@/components/ui/skeleton'
import { useSkills } from '@/hooks/useSkills'

export function SkillGridWidget() {
  const { data: skills, loading, error } = useSkills()

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (error || !skills) {
    return (
      <div className="text-sm text-destructive">
        Failed to load skills: {error || 'Unknown error'}
      </div>
    )
  }

  return <SkillGrid skills={skills} />
}
