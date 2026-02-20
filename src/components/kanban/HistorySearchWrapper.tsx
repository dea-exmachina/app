import { tables } from '@/lib/server/database'
import { HistorySearch } from './HistorySearch'

const EXCLUDED = ['kerkoporta', 'kerkoporta-writing', 'job-search']

export async function HistorySearchWrapper() {
  let projects: Array<{ id: string; name: string }> = []
  try {
    const { data } = await tables.nexus_projects.select('id, slug, name').order('name')
    projects = (data ?? [])
      .filter((p: { slug: string }) => !EXCLUDED.includes(p.slug))
      .map((p: { id: string; slug: string; name: string }) => ({ id: p.slug, name: p.name }))
  } catch {
    // fallback empty
  }
  return <HistorySearch projects={projects} />
}
