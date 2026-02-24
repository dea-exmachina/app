import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CREEP | nexus',
  description: 'External orchestration layer — events, agents, webhooks',
}

export default function CreepLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <>{children}</>
}
