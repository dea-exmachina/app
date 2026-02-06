import type { Metadata } from 'next'

export function pageMetadata(title: string): Metadata {
  return {
    title: `dea::control | ${title}`,
    description: 'Control center for dea-exmachina',
  }
}
