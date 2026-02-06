import type { Skill } from '@/types/skill'
import { CATEGORY_MAP } from '@/config/categories'
import { CategoryHeader } from './CategoryHeader'
import { SkillCard } from './SkillCard'

interface SkillGridProps {
  skills: Skill[]
}

export function SkillGrid({ skills }: SkillGridProps) {
  // Group skills by category
  const grouped = skills.reduce(
    (acc, skill) => {
      if (!acc[skill.category]) {
        acc[skill.category] = []
      }
      acc[skill.category].push(skill)
      return acc
    },
    {} as Record<string, Skill[]>
  )

  // Get category display names and colors
  const categoryOrder = Object.entries(CATEGORY_MAP).map(([name, config]) => ({
    name,
    slug: config.slug,
    color: config.color,
  }))

  return (
    <div className="space-y-8">
      {categoryOrder.map(({ name, slug, color }) => {
        const categorySkills = grouped[slug] || []
        if (categorySkills.length === 0) return null

        return (
          <div key={slug}>
            <CategoryHeader
              category={name}
              count={categorySkills.length}
              color={color}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categorySkills.map((skill) => (
                <SkillCard key={skill.name} skill={skill} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
