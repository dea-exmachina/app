'use client'

import { useState, useCallback, useEffect } from 'react'
import type { WebhookConfig, TransformConfig } from '@/types/queen'
import type { UpdateWebhookData } from '@/hooks/useWebhookConfigs'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { TransformConfigEditor } from './TransformConfigEditor'
import { formatRelativeDate } from '@/lib/client/formatters'
import { Check, Copy, AlertCircle } from 'lucide-react'

const WEBHOOK_BASE_URL = 'https://dea-exmachina.xyz/api/webhooks'

interface WebhookDetailProps {
  config: WebhookConfig | null
  open: boolean
  onClose: () => void
  onUpdate: (id: string, data: UpdateWebhookData) => Promise<WebhookConfig>
  mutating: boolean
}

export function WebhookDetail({
  config,
  open,
  onClose,
  onUpdate,
  mutating,
}: WebhookDetailProps) {
  const [enabled, setEnabled] = useState(false)
  const [transformConfig, setTransformConfig] = useState<TransformConfig>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Sync local state when config changes
  useEffect(() => {
    if (config) {
      setEnabled(config.enabled)
      setTransformConfig(config.transform_config ?? {})
      setSaveError(null)
      setDirty(false)
    }
  }, [config])

  const handleEnabledToggle = useCallback(() => {
    setEnabled((prev) => !prev)
    setDirty(true)
  }, [])

  const handleTransformChange = useCallback((updated: TransformConfig) => {
    setTransformConfig(updated)
    setDirty(true)
  }, [])

  const handleSave = useCallback(async () => {
    if (!config) return
    setSaveError(null)

    try {
      await onUpdate(config.id, {
        enabled,
        transform_config: transformConfig,
      })
      setDirty(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    }
  }, [config, enabled, transformConfig, onUpdate])

  const handleCopyUrl = useCallback(async () => {
    if (!config) return
    const url = `${WEBHOOK_BASE_URL}/${config.source}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select text in a temporary input
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [config])

  if (!config) return null

  const webhookUrl = `${WEBHOOK_BASE_URL}/${config.source}`

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader className="px-4 pt-4">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`font-mono text-xs gap-1.5 ${
                enabled
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
              }`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  enabled ? 'bg-emerald-400' : 'bg-zinc-400'
                }`}
              />
              {enabled ? 'enabled' : 'disabled'}
            </Badge>
          </div>
          <SheetTitle className="text-base">{config.source}</SheetTitle>
          <SheetDescription className="font-mono text-xs">
            Last updated: {new Date(config.updated_at).toLocaleString()} ({formatRelativeDate(config.updated_at)})
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 pb-6">
            {/* Webhook URL with copy */}
            <div>
              <h3 className="font-mono text-xs font-semibold text-muted-foreground mb-2">
                Webhook URL
              </h3>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-xs bg-muted px-2.5 py-1.5 rounded-md break-all">
                  {webhookUrl}
                </code>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleCopyUrl}
                  title="Copy webhook URL"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-3">
              <MetadataField label="ID" value={config.id} mono />
              <MetadataField label="Source" value={config.source} mono />
              <MetadataField label="Endpoint Path" value={config.endpoint_path} mono />
              <MetadataField
                label="Secret"
                value={config.secret ? config.secret : 'None'}
                mono
              />
              <MetadataField label="Created" value={formatRelativeDate(config.created_at)} mono />
              <MetadataField label="Updated" value={formatRelativeDate(config.updated_at)} mono />
            </div>

            <Separator />

            {/* Enabled toggle */}
            <div>
              <h3 className="font-mono text-xs font-semibold text-muted-foreground mb-2">
                Status
              </h3>
              <button
                type="button"
                onClick={handleEnabledToggle}
                disabled={mutating}
                className="flex items-center gap-3 w-full rounded-md bg-muted/50 px-3 py-2 hover:bg-muted transition-colors disabled:opacity-50"
              >
                <ToggleSwitch enabled={enabled} />
                <span className="font-mono text-xs">
                  Webhook source is {enabled ? 'enabled' : 'disabled'}
                </span>
              </button>
            </div>

            <Separator />

            {/* Transform config editor */}
            <TransformConfigEditor
              config={transformConfig}
              onChange={handleTransformChange}
              disabled={mutating}
            />

            {/* Save error */}
            {saveError && (
              <div className="flex items-center gap-2 rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                <p className="font-mono text-xs text-red-400">{saveError}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Save footer */}
        <SheetFooter className="px-4 pb-4">
          <Button
            onClick={handleSave}
            disabled={!dirty || mutating}
            className="w-full font-mono text-xs"
            size="sm"
          >
            {mutating ? 'Saving...' : dirty ? 'Save Changes' : 'No Changes'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function MetadataField({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <span className="font-mono text-xs text-muted-foreground">{label}</span>
      <p className={`text-sm truncate ${mono ? 'font-mono text-xs' : ''}`} title={value}>
        {value}
      </p>
    </div>
  )
}

/**
 * Custom toggle switch using pure Tailwind — no shadcn switch component needed.
 */
function ToggleSwitch({ enabled }: { enabled: boolean }) {
  return (
    <div
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
        enabled ? 'bg-emerald-500' : 'bg-zinc-600'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
      />
    </div>
  )
}
