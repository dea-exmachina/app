import { Header } from './Header'

interface ModuleShellProps {
  title: string
  description: string
  actions?: React.ReactNode
  children: React.ReactNode
}

export function ModuleShell({
  title,
  description,
  actions,
  children,
}: ModuleShellProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <Header title={title} description={description} />
        {actions && <div className="ml-4">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
