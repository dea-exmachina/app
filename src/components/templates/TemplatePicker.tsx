/**
 * Template Picker Component
 *
 * Displays available project templates for selection.
 * Used during project creation flow.
 */

'use client'

import { useState, useEffect } from 'react'
import type { ProjectTemplate } from '@/types/project'

interface TemplatePickerProps {
  selectedTemplate?: string // template slug
  onSelect: (template: ProjectTemplate | null) => void
  projectType?: string // Filter by project type
}

export function TemplatePicker({
  selectedTemplate,
  onSelect,
  projectType,
}: TemplatePickerProps) {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true)
        const url = projectType
          ? `/api/templates?project_type=${projectType}`
          : '/api/templates'

        const response = await fetch(url)
        if (!response.ok) {
          throw new Error('Failed to fetch templates')
        }

        const data = await response.json()
        setTemplates(data.templates || [])
      } catch (err) {
        console.error('Error fetching templates:', err)
        setError('Failed to load templates')
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [projectType])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-lg border border-border bg-muted"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* No Template Option */}
      <button
        onClick={() => onSelect(null)}
        className={`w-full rounded-lg border p-4 text-left transition-colors ${
          !selectedTemplate
            ? 'border-primary bg-primary/10'
            : 'border-border bg-card hover:border-primary/50'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="text-2xl">🚀</div>
          <div className="flex-1">
            <div className="font-medium">Start from Scratch</div>
            <div className="text-muted-foreground text-sm">
              Create an empty project with no pre-configured setup
            </div>
          </div>
        </div>
      </button>

      {/* Template Options */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className={`rounded-lg border p-4 text-left transition-colors ${
              selectedTemplate === template.slug
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card hover:border-primary/50'
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="text-2xl">{template.icon || '📦'}</div>
              <div className="rounded bg-muted px-2 py-1 text-xs capitalize">
                {template.project_type}
              </div>
            </div>
            <div className="mb-1 font-medium">{template.name}</div>
            <div className="line-clamp-2 text-muted-foreground text-sm">
              {template.description}
            </div>
          </button>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-muted-foreground text-sm">
            No templates available
            {projectType && ` for ${projectType} projects`}
          </p>
        </div>
      )}
    </div>
  )
}
