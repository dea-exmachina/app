'use client'

import { useState, useCallback } from 'react'
import type { TransformConfig } from '@/types/creep'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'

interface TransformConfigEditorProps {
  config: TransformConfig
  onChange: (config: TransformConfig) => void
  disabled?: boolean
}

export function TransformConfigEditor({
  config,
  onChange,
  disabled = false,
}: TransformConfigEditorProps) {
  const [expanded, setExpanded] = useState(true)

  const updateField = useCallback(
    (field: keyof TransformConfig, value: unknown) => {
      onChange({ ...config, [field]: value })
    },
    [config, onChange]
  )

  return (
    <div className="rounded-md border border-border">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/30 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
        <span className="font-mono text-xs font-semibold text-muted-foreground">
          Transform Config
        </span>
        <FieldCount config={config} />
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          <Separator />

          {/* Title field */}
          <FieldInput
            label="title_field"
            placeholder="e.g. fields.summary"
            value={config.title_field ?? ''}
            onChange={(v) => updateField('title_field', v || undefined)}
            disabled={disabled}
          />

          {/* Description field */}
          <FieldInput
            label="description_field"
            placeholder="e.g. fields.description"
            value={config.description_field ?? ''}
            onChange={(v) => updateField('description_field', v || undefined)}
            disabled={disabled}
          />

          {/* Priority field */}
          <FieldInput
            label="priority_field"
            placeholder="e.g. fields.priority.name"
            value={config.priority_field ?? ''}
            onChange={(v) => updateField('priority_field', v || undefined)}
            disabled={disabled}
          />

          {/* Tag fields */}
          <TagFieldsEditor
            tags={config.tag_fields ?? []}
            onChange={(tags) => updateField('tag_fields', tags.length > 0 ? tags : undefined)}
            disabled={disabled}
          />

          {/* Status map */}
          <StatusMapEditor
            statusMap={config.status_map ?? {}}
            onChange={(map) =>
              updateField('status_map', Object.keys(map).length > 0 ? map : undefined)
            }
            disabled={disabled}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Shows count of configured fields as a subtle indicator.
 */
function FieldCount({ config }: { config: TransformConfig }) {
  let count = 0
  if (config.title_field) count++
  if (config.description_field) count++
  if (config.priority_field) count++
  if (config.tag_fields && config.tag_fields.length > 0) count++
  if (config.status_map && Object.keys(config.status_map).length > 0) count++

  if (count === 0) return null

  return (
    <span className="ml-auto font-mono text-xs text-muted-foreground">
      {count} field{count !== 1 ? 's' : ''} mapped
    </span>
  )
}

/**
 * Single dot-notation field input.
 */
function FieldInput({
  label,
  placeholder,
  value,
  onChange,
  disabled,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  return (
    <div>
      <label className="font-mono text-xs text-muted-foreground block mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full font-mono text-xs bg-muted border border-border rounded-md px-2.5 py-1.5 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      />
    </div>
  )
}

/**
 * Tag fields editor — array of dot-notation paths.
 */
function TagFieldsEditor({
  tags,
  onChange,
  disabled,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  disabled: boolean
}) {
  const addTag = useCallback(() => {
    onChange([...tags, ''])
  }, [tags, onChange])

  const removeTag = useCallback(
    (index: number) => {
      onChange(tags.filter((_, i) => i !== index))
    },
    [tags, onChange]
  )

  const updateTag = useCallback(
    (index: number, value: string) => {
      const updated = [...tags]
      updated[index] = value
      onChange(updated)
    },
    [tags, onChange]
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="font-mono text-xs text-muted-foreground">tag_fields</label>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={addTag}
          disabled={disabled}
          title="Add tag field"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      {tags.length === 0 ? (
        <p className="font-mono text-xs text-muted-foreground/50 italic">No tag fields configured</p>
      ) : (
        <div className="space-y-1.5">
          {tags.map((tag, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <input
                type="text"
                value={tag}
                onChange={(e) => updateTag(index, e.target.value)}
                placeholder="e.g. fields.labels"
                disabled={disabled}
                className="flex-1 font-mono text-xs bg-muted border border-border rounded-md px-2.5 py-1.5 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => removeTag(index)}
                disabled={disabled}
                title="Remove tag field"
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Status map editor — key-value pairs (external status -> internal status).
 */
function StatusMapEditor({
  statusMap,
  onChange,
  disabled,
}: {
  statusMap: Record<string, string>
  onChange: (map: Record<string, string>) => void
  disabled: boolean
}) {
  const entries = Object.entries(statusMap)

  const addEntry = useCallback(() => {
    onChange({ ...statusMap, '': '' })
  }, [statusMap, onChange])

  const removeEntry = useCallback(
    (key: string) => {
      const updated = { ...statusMap }
      delete updated[key]
      onChange(updated)
    },
    [statusMap, onChange]
  )

  const updateEntry = useCallback(
    (oldKey: string, newKey: string, value: string) => {
      const updated: Record<string, string> = {}
      for (const [k, v] of Object.entries(statusMap)) {
        if (k === oldKey) {
          updated[newKey] = value
        } else {
          updated[k] = v
        }
      }
      onChange(updated)
    },
    [statusMap, onChange]
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="font-mono text-xs text-muted-foreground">status_map</label>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={addEntry}
          disabled={disabled}
          title="Add status mapping"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      {entries.length === 0 ? (
        <p className="font-mono text-xs text-muted-foreground/50 italic">No status mappings configured</p>
      ) : (
        <div className="space-y-1.5">
          {/* Column headers */}
          <div className="flex items-center gap-1.5">
            <span className="flex-1 font-mono text-xs text-muted-foreground/70 px-1">
              External Status
            </span>
            <span className="w-3" /> {/* Arrow spacer */}
            <span className="flex-1 font-mono text-xs text-muted-foreground/70 px-1">
              Internal Status
            </span>
            <span className="w-6" /> {/* Delete button spacer */}
          </div>
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-center gap-1.5">
              <input
                type="text"
                value={key}
                onChange={(e) => updateEntry(key, e.target.value, value)}
                placeholder="e.g. To Do"
                disabled={disabled}
                className="flex-1 font-mono text-xs bg-muted border border-border rounded-md px-2.5 py-1.5 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
              <span className="font-mono text-xs text-muted-foreground shrink-0">&rarr;</span>
              <input
                type="text"
                value={value}
                onChange={(e) => updateEntry(key, key, e.target.value)}
                placeholder="e.g. proposed"
                disabled={disabled}
                className="flex-1 font-mono text-xs bg-muted border border-border rounded-md px-2.5 py-1.5 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => removeEntry(key)}
                disabled={disabled}
                title="Remove mapping"
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
