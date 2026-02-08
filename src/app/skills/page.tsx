'use client'

import { WidgetGrid } from '@/components/widgets/WidgetGrid'
import { skillsConfig } from '@/config/layouts/skills'

export default function SkillsPage() {
  return <WidgetGrid config={skillsConfig} />
}
