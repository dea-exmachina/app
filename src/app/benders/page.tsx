'use client'

import { WidgetGrid } from '@/components/widgets/WidgetGrid'
import { bendersConfig } from '@/config/layouts/benders'

export default function BendersPage() {
  return <WidgetGrid config={bendersConfig} />
}
