import type { PageLayoutConfig } from '@/types/widget'
import { InboxWidget } from '@/components/widgets/inbox/InboxWidget'

export const inboxConfig: PageLayoutConfig = {
  pageId: 'inbox',
  widgets: [
    {
      id: 'inbox-main',
      title: 'Inbox',
      component: InboxWidget,
      defaultSize: { w: 12, h: 10, minH: 6 },
    },
  ],
  defaultLayouts: {
    lg: [{ i: 'inbox-main', x: 0, y: 0, w: 12, h: 10, minH: 6 }],
    md: [{ i: 'inbox-main', x: 0, y: 0, w: 8, h: 10, minH: 6 }],
    sm: [{ i: 'inbox-main', x: 0, y: 0, w: 4, h: 12, minH: 6 }],
  },
}
