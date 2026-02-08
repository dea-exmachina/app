"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/* ─── Types ─── */

export interface TerminalColumn<T> {
  key: string
  label: string
  width?: string
  align?: "left" | "center" | "right"
  sortable?: boolean
  render?: (row: T, index: number) => React.ReactNode
}

type SortDir = "asc" | "desc" | null

/* ─── Table Root ─── */

interface TerminalTableProps<T> {
  columns: TerminalColumn<T>[]
  data: T[]
  getRowKey: (row: T, index: number) => string
  onRowClick?: (row: T, index: number) => void
  className?: string
  compact?: boolean
  stickyHeader?: boolean
}

export function TerminalTable<T>({
  columns,
  data,
  getRowKey,
  onRowClick,
  className,
  compact = false,
  stickyHeader = true,
}: TerminalTableProps<T>) {
  const [sortKey, setSortKey] = React.useState<string | null>(null)
  const [sortDir, setSortDir] = React.useState<SortDir>(null)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : prev === "desc" ? null : "asc"))
      if (sortDir === "desc") setSortKey(null)
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sortedData = React.useMemo(() => {
    if (!sortKey || !sortDir) return data
    const col = columns.find((c) => c.key === sortKey)
    if (!col) return data
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey]
      const bVal = (b as Record<string, unknown>)[sortKey]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal
      }
      const aStr = String(aVal)
      const bStr = String(bVal)
      return sortDir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    })
  }, [data, sortKey, sortDir, columns])

  const rowHeight = compact ? "h-7" : "h-8"

  return (
    <div className={cn("overflow-auto", className)}>
      <table className="w-full border-collapse font-mono text-xs">
        <thead>
          <tr
            className={cn(
              "border-b border-terminal-border-strong",
              stickyHeader && "sticky top-0 z-10 bg-terminal-bg-surface"
            )}
          >
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "terminal-label px-2 py-1 text-left font-normal select-none",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                  col.sortable && "cursor-pointer hover:text-terminal-fg-primary"
                )}
                style={col.width ? { width: col.width } : undefined}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span className="text-user-accent">
                      {sortDir === "asc" ? "^" : "v"}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, i) => (
            <tr
              key={getRowKey(row, i)}
              className={cn(
                rowHeight,
                "border-b border-terminal-border",
                i % 2 === 1 && "bg-terminal-bg-elevated/50",
                onRowClick && "cursor-pointer hover:bg-terminal-bg-elevated"
              )}
              onClick={onRowClick ? () => onRowClick(row, i) : undefined}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-2 py-1 text-terminal-fg-primary truncate",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center"
                  )}
                >
                  {col.render
                    ? col.render(row, i)
                    : String((row as Record<string, unknown>)[col.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
          {sortedData.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-2 py-4 text-center text-terminal-fg-tertiary"
              >
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
