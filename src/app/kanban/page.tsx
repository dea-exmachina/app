import { Header } from '@/components/layout/Header'

export default function KanbanPage() {
  return (
    <div className="space-y-6">
      <Header
        title="Kanban"
        description="Visual boards parsed from markdown"
      />
      <p className="font-mono text-sm text-muted-foreground">
        Board view will render here. Connect data source to load boards.
      </p>
    </div>
  )
}
