import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'QUEEN | dea::control',
  description: 'External orchestration layer — events, agents, webhooks',
}

export default function QueenLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <>{children}</>
}
