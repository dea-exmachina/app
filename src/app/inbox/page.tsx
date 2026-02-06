'use client'

import { WidgetGrid } from '@/components/widgets/WidgetGrid'
import { WidgetToolbar } from '@/components/widgets/WidgetToolbar'
import { inboxConfig } from '@/config/layouts/inbox'

export default function InboxPage() {
  return (
    <>
      <WidgetToolbar pageId="inbox" />
      <WidgetGrid pageId="inbox" config={inboxConfig} />
    </>
  )
}
