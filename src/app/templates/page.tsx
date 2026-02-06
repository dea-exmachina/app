/**
 * Templates Page (Demo)
 *
 * Showcases the 3 starter templates with details.
 */

'use client'

import { useState } from 'react'
import { TemplatePicker } from '@/components/templates/TemplatePicker'
import type { ProjectTemplate } from '@/types/project'

export default function TemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] =
    useState<ProjectTemplate | null>(null)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Project Templates</h1>
          <p className="text-muted-foreground text-sm">
            Choose a template to kickstart your project
          </p>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <TemplatePicker
            selectedTemplate={selectedTemplate?.slug}
            onSelect={setSelectedTemplate}
          />

          {selectedTemplate && (
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{selectedTemplate.icon}</div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {selectedTemplate.name}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      {selectedTemplate.description}
                    </p>
                  </div>
                </div>
                <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm font-medium hover:bg-primary/90">
                  Use Template
                </button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Dashboard Layout */}
                <div>
                  <h3 className="mb-2 font-semibold text-sm">
                    Dashboard Layout
                  </h3>
                  <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Columns:</span>{' '}
                      {
                        (selectedTemplate.dashboard_layout as any)?.columns || 4
                      }
                    </div>
                    <div>
                      <span className="text-muted-foreground">Widgets:</span>{' '}
                      {(selectedTemplate.dashboard_layout as any)?.widgets
                        ?.length || 0}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Theme:</span>{' '}
                      {(selectedTemplate.dashboard_layout as any)?.theme ||
                        'auto'}
                    </div>
                  </div>
                </div>

                {/* Suggested Benders */}
                <div>
                  <h3 className="mb-2 font-semibold text-sm">
                    Suggested Benders
                  </h3>
                  <div className="space-y-1 rounded-md border border-border bg-muted/30 p-3">
                    {(selectedTemplate.suggested_benders as any[])?.map(
                      (bender, i) => (
                        <div
                          key={i}
                          className="text-xs"
                        >
                          <span className="font-medium capitalize">
                            {bender.role}
                          </span>
                          <span className="text-muted-foreground">
                            {' '}
                            — {bender.expertise?.join(', ')}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Starter Workflows */}
                <div>
                  <h3 className="mb-2 font-semibold text-sm">
                    Starter Workflows
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.starter_workflows?.map((workflow) => (
                      <div
                        key={workflow}
                        className="rounded bg-muted px-2 py-1 text-xs"
                      >
                        {workflow}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Setup Questions */}
                <div>
                  <h3 className="mb-2 font-semibold text-sm">
                    Setup Questions
                  </h3>
                  <div className="space-y-1 rounded-md border border-border bg-muted/30 p-3">
                    {(selectedTemplate.setup_questions as any[])?.map(
                      (q, i) => (
                        <div
                          key={i}
                          className="text-xs"
                        >
                          {i + 1}. {q.question}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
