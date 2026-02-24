import type { Metadata } from 'next'

export function pageMetadata(title: string): Metadata {
  return {
    title: `nexus | ${title}`,
    description: 'Your AI operating system',
  }
}
