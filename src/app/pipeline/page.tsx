'use client'

import { WidgetGrid } from '@/components/widgets/WidgetGrid'
import { pipelineConfig } from '@/config/layouts/pipeline'

export default function PipelinePage() {
  return <WidgetGrid config={pipelineConfig} />
}
