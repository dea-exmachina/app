import { cn } from "@/lib/utils"

export function SectionDivider({
  label,
  count,
  right,
  className,
}: {
  label: string
  count?: number | string
  right?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 py-1",
        className
      )}
    >
      <span className="text-terminal-fg-tertiary font-mono text-[10px] select-none">
        {"──"}
      </span>
      <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-terminal-fg-tertiary whitespace-nowrap">
        {label}
      </span>
      {count !== undefined && (
        <span className="font-mono text-[10px] text-terminal-fg-secondary whitespace-nowrap">
          {count}
        </span>
      )}
      <span className="flex-1 border-b border-terminal-border" />
      {right && (
        <span className="font-mono text-[10px] text-terminal-fg-tertiary whitespace-nowrap">
          {right}
        </span>
      )}
    </div>
  )
}
