'use client'

import { WidgetGrid } from '@/components/widgets/WidgetGrid'
import { WidgetToolbar } from '@/components/widgets/WidgetToolbar'
import { bendersConfig } from '@/config/layouts/benders'

export default function BendersPage() {
  return (
    <>
      <WidgetToolbar pageId="benders" />
      <WidgetGrid pageId="benders" config={bendersConfig} />
    </>
  )
}
