'use client'

import { Badge } from '@/components/ui/badge'
import { StatusDot, statusToType } from '@/components/ui/status-dot'
import { formatDate } from '@/lib/client/formatters'
import { useProjectDashboardContext } from './ProjectDashboardProvider'

export function ProjectBriefWidget() {
  const { data } = useProjectDashboardContext()
  const { project, template, nexusProject } = data

  return (
    <div className="space-y-4 h-full overflow-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusDot status={statusToType(project.status)} label={project.status} />
          <Badge variant="terminal">{project.type}</Badge>
          {nexusProject && (
            <Badge variant="terminal">{nexusProject.card_id_prefix}</Badge>
          )}
        </div>

        {template && (
          <div>
            <span className="terminal-label">TEMPLATE</span>
            <span className="ml-2 text-xs text-terminal-fg-secondary font-mono">
              {template.name}
            </span>
          </div>
        )}
      </div>

      {/* Info rows */}
      <div className="space-y-2">
        {project.created_at && <InfoRow label="CREATED" value={formatDate(project.created_at)} />}
        {project.repo_path && <InfoRow label="REPO" value={project.repo_path} />}
        {project.git_repo_url && (
          <InfoRow label="GIT" value={project.git_repo_url} link />
        )}
        {project.vercel_project_id && (
          <InfoRow label="VERCEL" value={project.vercel_project_id} />
        )}
        {project.supabase_project_id && (
          <InfoRow label="SUPABASE" value={project.supabase_project_id} />
        )}
      </div>

      {/* Integrations */}
      {project.integrations && Object.keys(project.integrations as object).length > 0 && (
        <div>
          <span className="terminal-label">INTEGRATIONS</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.keys(project.integrations as object).map((key) => (
              <Badge key={key} variant="terminal">{key}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({
  label,
  value,
  link,
}: {
  label: string
  value: string
  link?: boolean
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="terminal-label shrink-0 w-20">{label}</span>
      {link ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-user-accent hover:underline truncate"
        >
          {value}
        </a>
      ) : (
        <span className="text-xs font-mono text-terminal-fg-secondary truncate">
          {value}
        </span>
      )}
    </div>
  )
}
