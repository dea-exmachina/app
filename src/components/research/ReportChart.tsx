'use client'

/**
 * ReportChart — terminal-aesthetic chart wrapper for research report sections.
 *
 * NOTE: Requires recharts. Install with: npm install recharts
 * This component is inert (returns null) until recharts is available.
 */

import type React from 'react'
import type { ReportChart as ReportChartType } from '@/types/research'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const recharts = (() => {
  try {
    return require('recharts') as typeof import('recharts')
  } catch {
    return null
  }
})()

interface Props {
  chart: ReportChartType
}

export function ReportChart({ chart }: Props): React.ReactElement | null {
  if (!recharts) return null
  if (!chart.data || chart.data.length < 2) return null

  const { LineChart, BarChart, AreaChart, Line, Bar, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } = recharts

  const commonProps = {
    data: chart.data,
    margin: { top: 4, right: 8, bottom: 4, left: 8 },
  }

  const axisStyle = { fontSize: 10, fontFamily: 'monospace', fill: 'var(--terminal-fg-tertiary)' }
  const tooltipStyle = {
    backgroundColor: 'var(--terminal-bg-surface)',
    border: '1px solid var(--terminal-border)',
    borderRadius: 0,
    fontFamily: 'monospace',
    fontSize: 11,
  }

  return (
    <div className="mt-4 border border-terminal-border bg-terminal-bg-surface px-4 py-3">
      <p className="font-mono text-[11px] uppercase tracking-wider text-terminal-fg-tertiary mb-3">
        {chart.title}
      </p>
      <ResponsiveContainer width="100%" height={160}>
        {chart.type === 'bar' ? (
          <BarChart {...commonProps}>
            <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={32} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--terminal-bg-hover)' }} />
            <Bar dataKey="value" fill="var(--user-accent)" radius={0} />
          </BarChart>
        ) : chart.type === 'area' ? (
          <AreaChart {...commonProps}>
            <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={32} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="value" stroke="var(--user-accent)" fill="var(--user-accent)" fillOpacity={0.1} strokeWidth={1.5} />
          </AreaChart>
        ) : (
          <LineChart {...commonProps}>
            <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={32} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="value" stroke="var(--user-accent)" strokeWidth={1.5} dot={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
      {chart.description && (
        <p className="font-mono text-[10px] text-terminal-fg-tertiary mt-2">{chart.description}</p>
      )}
    </div>
  )
}
