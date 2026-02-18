/**
 * Research Report Layout
 *
 * Standalone full-width layout — no CC sidebar.
 * Reports are publicly accessible (middleware excludes /research/reports).
 * This layout overrides the root layout's sidebar + padding for a clean reading surface.
 */

import type React from 'react'

export default function ReportLayout({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div className="min-h-screen bg-terminal-bg-base">{children}</div>
  )
}
