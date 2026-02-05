import { Header } from '@/components/layout/Header'

export default function WorkflowsPage() {
  return (
    <div className="space-y-6">
      <Header
        title="Workflows"
        description="Filterable workflow list with full content"
      />
      <p className="font-mono text-sm text-muted-foreground">
        Workflow list will render here. Connect data source to load workflows.
      </p>
    </div>
  )
}
