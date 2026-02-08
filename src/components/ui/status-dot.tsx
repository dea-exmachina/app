import { cn } from "@/lib/utils"

type StatusType = "ok" | "warn" | "error" | "info" | "idle"

const statusColorMap: Record<StatusType, string> = {
  ok: "bg-status-ok",
  warn: "bg-status-warn",
  error: "bg-status-error",
  info: "bg-status-info",
  idle: "bg-terminal-fg-tertiary",
}

const statusLabelColorMap: Record<StatusType, string> = {
  ok: "text-status-ok",
  warn: "text-status-warn",
  error: "text-status-error",
  info: "text-status-info",
  idle: "text-terminal-fg-tertiary",
}

export function StatusDot({
  status,
  label,
  className,
  size = 6,
}: {
  status: StatusType
  label?: string
  className?: string
  size?: number
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn("rounded-full shrink-0", statusColorMap[status])}
        style={{ width: size, height: size }}
      />
      {label && (
        <span
          className={cn(
            "font-mono text-[11px]",
            statusLabelColorMap[status]
          )}
        >
          {label}
        </span>
      )}
    </span>
  )
}

export function statusToType(
  status: string | undefined | null
): StatusType {
  if (!status) return "idle"
  const s = status.toLowerCase()
  if (["done", "complete", "completed", "success", "healthy", "delivered", "accepted"].includes(s)) return "ok"
  if (["in progress", "in_progress", "executing", "active", "processing", "running", "warn", "warning", "partial"].includes(s)) return "warn"
  if (["blocked", "error", "failed", "critical", "stuck", "rejected"].includes(s)) return "error"
  if (["info", "ready", "proposed", "planning", "review"].includes(s)) return "info"
  return "idle"
}
