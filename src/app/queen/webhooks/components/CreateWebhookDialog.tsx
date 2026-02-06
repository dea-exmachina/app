'use client'

import { useState, useCallback } from 'react'
import type { TransformConfig } from '@/types/queen'
import type { CreateWebhookData } from '@/hooks/useWebhookConfigs'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { TransformConfigEditor } from './TransformConfigEditor'
import { AlertCircle } from 'lucide-react'

interface CreateWebhookDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (data: CreateWebhookData) => Promise<unknown>
  mutating: boolean
}

export function CreateWebhookDialog({
  open,
  onClose,
  onCreate,
  mutating,
}: CreateWebhookDialogProps) {
  const [source, setSource] = useState('')
  const [endpointPath, setEndpointPath] = useState('')
  const [secret, setSecret] = useState('')
  const [transformConfig, setTransformConfig] = useState<TransformConfig>({})
  const [error, setError] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setSource('')
    setEndpointPath('')
    setSecret('')
    setTransformConfig({})
    setError(null)
  }, [])

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])

  const handleCreate = useCallback(async () => {
    setError(null)

    // Client-side validation
    if (!source.trim()) {
      setError('Source name is required')
      return
    }
    if (!endpointPath.trim()) {
      setError('Endpoint path is required')
      return
    }

    try {
      await onCreate({
        source: source.trim(),
        endpoint_path: endpointPath.trim(),
        secret: secret.trim() || undefined,
        transform_config: transformConfig,
      })
      resetForm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create webhook')
    }
  }, [source, endpointPath, secret, transformConfig, onCreate, resetForm, onClose])

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader className="px-4 pt-4">
          <SheetTitle className="text-base">Register Webhook Source</SheetTitle>
          <SheetDescription className="font-mono text-xs">
            Configure a new external webhook source for the QUEEN pipeline.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 pb-6">
            {/* Source name */}
            <div>
              <label className="font-mono text-xs text-muted-foreground block mb-1">
                Source Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. jira, linear, gcal"
                disabled={mutating}
                className="w-full font-mono text-xs bg-muted border border-border rounded-md px-2.5 py-1.5 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
              <p className="font-mono text-xs text-muted-foreground/50 mt-1">
                Lowercase, alphanumeric + hyphens only. This becomes the webhook identity.
              </p>
            </div>

            {/* Endpoint path */}
            <div>
              <label className="font-mono text-xs text-muted-foreground block mb-1">
                Endpoint Path <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={endpointPath}
                onChange={(e) => setEndpointPath(e.target.value)}
                placeholder="e.g. /api/webhooks/jira"
                disabled={mutating}
                className="w-full font-mono text-xs bg-muted border border-border rounded-md px-2.5 py-1.5 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
            </div>

            {/* Secret (optional) */}
            <div>
              <label className="font-mono text-xs text-muted-foreground block mb-1">
                Shared Secret
              </label>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Optional — for HMAC signature verification"
                disabled={mutating}
                className="w-full font-mono text-xs bg-muted border border-border rounded-md px-2.5 py-1.5 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
            </div>

            <Separator />

            {/* Transform config */}
            <TransformConfigEditor
              config={transformConfig}
              onChange={setTransformConfig}
              disabled={mutating}
            />

            {/* Error display */}
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                <p className="font-mono text-xs text-red-400">{error}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="px-4 pb-4">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={mutating}
              className="flex-1 font-mono text-xs"
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={mutating || !source.trim() || !endpointPath.trim()}
              className="flex-1 font-mono text-xs"
              size="sm"
            >
              {mutating ? 'Creating...' : 'Register Source'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
