import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center border border-transparent font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "rounded-full px-2 py-0.5 text-xs bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "rounded-full px-2 py-0.5 text-xs bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "rounded-full px-2 py-0.5 text-xs bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "rounded-full px-2 py-0.5 text-xs border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost:
          "rounded-full px-2 py-0.5 text-xs [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "rounded-full px-2 py-0.5 text-xs text-primary underline-offset-4 [a&]:hover:underline",
        terminal:
          "rounded-sm px-1.5 py-px text-[10px] font-mono tracking-wide bg-terminal-bg-elevated text-terminal-fg-secondary border-terminal-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
