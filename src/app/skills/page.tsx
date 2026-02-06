'use client'

import { Header } from '@/components/layout/Header'
import { SkillGrid } from '@/components/skills/SkillGrid'
import { useSkills } from '@/hooks/useSkills'

export default function SkillsPage() {
  const { data: skills, loading, error } = useSkills()

  if (loading) {
    return (
      <div className="space-y-6">
        <Header
          title="Skills"
          description="Category-grouped skill browser"
        />
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error || !skills) {
    return (
      <div className="space-y-6">
        <Header
          title="Skills"
          description="Category-grouped skill browser"
        />
        <div className="text-sm text-destructive">
          Failed to load skills: {error || 'Unknown error'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Header title="Skills" description="Category-grouped skill browser" />
      <SkillGrid skills={skills} />
    </div>
  )
}
