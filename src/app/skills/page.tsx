'use client'

import { WidgetGrid } from '@/components/widgets/WidgetGrid'
import { WidgetToolbar } from '@/components/widgets/WidgetToolbar'
import { skillsConfig } from '@/config/layouts/skills'

export default function SkillsPage() {
  return (
    <>
      <WidgetToolbar pageId="skills" />
      <WidgetGrid pageId="skills" config={skillsConfig} />
    </>
  )
}
