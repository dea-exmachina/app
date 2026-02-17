'use client'

import { useState, useCallback } from 'react'
import type { WebhookConfig } from '@/types/creep'
import { useWebhookConfigs } from '@/hooks/useWebhookConfigs'
import { WebhookCard } from './WebhookCard'
import { WebhookDetail } from './WebhookDetail'
import { CreateWebhookDialog } from './CreateWebhookDialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, RefreshCw, Webhook, Plus } from 'lucide-react'

export function WebhookList() {
  const [selectedConfig, setSelectedConfig] = useState<WebhookConfig | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const {
    configs,
    loading,
    error,
    refresh,
    lastUpdated,
    createConfig,
    updateConfig,
    mutating,
  } = useWebhookConfigs({ pollInterval: 30000 })

  const handleSelect = useCallback((config: WebhookConfig) => {
    setSelectedConfig(config)
    setDetailOpen(true)
  }, [])

  const handleDetailClose = useCallback(() => {
    setDetailOpen(false)
    // Refresh to pick up any changes from optimistic updates
    refresh()
  }, [refresh])

  // Derive counts
  const enabledCount = configs.filter((c) => c.enabled).length
  const disabledCount = configs.filter((c) => !c.enabled).length

  return (
    <div className="space-y-4">
      {/* Toolbar: counts + create + refresh */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground shrink-0">
          {configs.length} source{configs.length !== 1 ? 's' : ''}
        </span>
        {configs.length > 0 && (
          <>
            <span className="font-mono text-xs text-emerald-400/70">
              {enabledCount} enabled
            </span>
            {disabledCount > 0 && (
              <span className="font-mono text-xs text-zinc-400/70">
                {disabledCount} disabled
              </span>
            )}
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={() => setCreateOpen(true)}
            className="font-mono gap-1"
          >
            <Plus className="h-3 w-3" />
            Register Source
          </Button>
          {lastUpdated && (
            <span className="font-mono text-xs text-muted-foreground hidden sm:inline">
              {formatLastUpdated(lastUpdated)}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={refresh}
            disabled={loading}
            title="Refresh webhooks"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Content area */}
      {loading && configs.length === 0 ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : configs.length === 0 ? (
        <EmptyState onCreateClick={() => setCreateOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {configs.map((config) => (
            <WebhookCard
              key={config.id}
              config={config}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {/* Detail sheet */}
      <WebhookDetail
        config={selectedConfig}
        open={detailOpen}
        onClose={handleDetailClose}
        onUpdate={updateConfig}
        mutating={mutating}
      />

      {/* Create dialog */}
      <CreateWebhookDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={createConfig}
        mutating={mutating}
      />
    </div>
  )
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-3 w-3/4" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border rounded-lg">
      <AlertCircle className="h-8 w-8 text-destructive mb-3" />
      <p className="text-sm font-medium mb-1">Failed to load webhook configs</p>
      <p className="text-xs text-muted-foreground mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="font-mono text-xs text-primary hover:underline"
      >
        Try again
      </button>
    </div>
  )
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border rounded-lg">
      <Webhook className="h-8 w-8 text-muted-foreground mb-3" />
      <p className="text-sm font-medium mb-1">No webhook sources registered</p>
      <p className="text-xs text-muted-foreground mb-4">
        Register an external webhook source to start receiving events in the CREEP pipeline.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onCreateClick}
        className="font-mono text-xs gap-1"
      >
        <Plus className="h-3 w-3" />
        Register First Source
      </Button>
    </div>
  )
}

function formatLastUpdated(date: Date): string {
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  return `${diffMin}m ago`
}
