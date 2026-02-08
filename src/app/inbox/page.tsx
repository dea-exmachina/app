'use client'

import { WidgetGrid } from '@/components/widgets/WidgetGrid'
import { inboxConfig } from '@/config/layouts/inbox'

export default function InboxPage() {
  return <WidgetGrid config={inboxConfig} />
}
