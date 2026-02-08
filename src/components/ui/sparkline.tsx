"use client"

import { cn } from "@/lib/utils"

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  className?: string
}

export function Sparkline({
  data,
  width = 60,
  height = 16,
  color,
  className,
}: SparklineProps) {
  if (!data.length) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((value - min) / range) * (height - 2) - 1
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("inline-block", className)}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color || "var(--user-accent)"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface ProgressBarProps {
  value: number
  max?: number
  width?: number
  height?: number
  color?: string
  bgColor?: string
  className?: string
}

export function InlineProgressBar({
  value,
  max = 100,
  width = 60,
  height = 8,
  color,
  bgColor,
  className,
}: ProgressBarProps) {
  const pct = Math.min(Math.max(value / max, 0), 1)

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("inline-block", className)}
    >
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={1}
        fill={bgColor || "var(--terminal-border-strong)"}
      />
      <rect
        x={0}
        y={0}
        width={width * pct}
        height={height}
        rx={1}
        fill={color || "var(--user-accent)"}
      />
    </svg>
  )
}
