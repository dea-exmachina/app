import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

export interface TokenStats {
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  totalCostUsd: number
  byModel: Array<{
    model: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
    costUsd: number
    count: number
  }>
  recentUsage: Array<{
    id: string
    model: string
    inputTokens: number
    outputTokens: number
    costUsd: number | null
    actor: string
    cardId: string | null
    createdAt: string
  }>
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') ?? '20', 10)
    const days = parseInt(searchParams.get('days') ?? '30', 10)

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Get all records in the time window
    const { data: records, error } = await tables.nexus_token_usage
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) throw error

    const rows = (records ?? []) as Array<Record<string, unknown>>

    // Aggregate by model
    const modelMap = new Map<string, { input: number; output: number; cost: number; count: number }>()
    let totalInput = 0
    let totalOutput = 0
    let totalCost = 0

    for (const row of rows) {
      const model = row.model as string
      const input = (row.input_tokens as number) || 0
      const output = (row.output_tokens as number) || 0
      const cost = (row.cost_usd as number) || 0

      totalInput += input
      totalOutput += output
      totalCost += cost

      const existing = modelMap.get(model) ?? { input: 0, output: 0, cost: 0, count: 0 }
      existing.input += input
      existing.output += output
      existing.cost += cost
      existing.count += 1
      modelMap.set(model, existing)
    }

    const byModel = Array.from(modelMap.entries())
      .map(([model, agg]) => ({
        model,
        inputTokens: agg.input,
        outputTokens: agg.output,
        totalTokens: agg.input + agg.output,
        costUsd: Math.round(agg.cost * 1000000) / 1000000,
        count: agg.count,
      }))
      .sort((a, b) => b.totalTokens - a.totalTokens)

    const recentUsage = rows.slice(0, limit).map((r) => ({
      id: r.id as string,
      model: r.model as string,
      inputTokens: (r.input_tokens as number) || 0,
      outputTokens: (r.output_tokens as number) || 0,
      costUsd: r.cost_usd as number | null,
      actor: r.actor as string,
      cardId: r.card_id as string | null,
      createdAt: r.created_at as string,
    }))

    const stats: TokenStats = {
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      totalTokens: totalInput + totalOutput,
      totalCostUsd: Math.round(totalCost * 100) / 100,
      byModel,
      recentUsage,
    }

    return NextResponse.json({ data: stats, cached: false })
  } catch (err) {
    console.error('Token stats error:', err)
    return NextResponse.json(
      { error: { message: 'Failed to fetch token stats' } },
      { status: 500 }
    )
  }
}
