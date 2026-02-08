import * as React from "react"
import { cn } from "@/lib/utils"

const TerminalInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full bg-terminal-bg-base border border-terminal-border rounded-sm px-2 py-1",
        "font-mono text-xs text-terminal-fg-primary placeholder:text-terminal-fg-tertiary",
        "focus:outline-none focus:border-user-accent focus:ring-1 focus:ring-user-accent-muted",
        "transition-colors",
        className
      )}
      {...props}
    />
  )
})
TerminalInput.displayName = "TerminalInput"

const TerminalTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full bg-terminal-bg-base border border-terminal-border rounded-sm px-2 py-1",
        "font-mono text-xs text-terminal-fg-primary placeholder:text-terminal-fg-tertiary",
        "focus:outline-none focus:border-user-accent focus:ring-1 focus:ring-user-accent-muted",
        "transition-colors resize-none",
        className
      )}
      {...props}
    />
  )
})
TerminalTextarea.displayName = "TerminalTextarea"

export { TerminalInput, TerminalTextarea }
