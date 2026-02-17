import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

export const dynamic = 'force-dynamic' // Ensure this isn't statically cached

/**
 * GET /api/routing/model?taskType=X
 *
 * Routes a task type to the appropriate AI model based on DEA-077 routing rules.
 * Returns the recommended model slug and the rationale for the choice.
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const taskType = searchParams.get('taskType')

        if (!taskType) {
            return NextResponse.json(
                { error: 'taskType query parameter is required' },
                { status: 400 }
            )
        }

        // Default fallback
        const FALLBACK_MODEL = 'gemini-2-flash'

        const { data: routing, error } = await tables.task_type_routing
            .select('*')
            .eq('task_type', taskType)
            .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 is "JSON object requested, multiple (or no) rows returned" - treating as not found
            console.error('Error fetching routing config:', error)
            return NextResponse.json(
                { error: 'Failed to fetch routing configuration' },
                { status: 500 }
            )
        }

        if (!routing) {
            return NextResponse.json({
                model: FALLBACK_MODEL,
                rationale: 'fallback-default',
                taskType
            })
        }

        // Determine rationale based on governance flag
        const rationale = routing.is_governance
            ? 'governance-required'
            : 'cheapest-capable'

        return NextResponse.json({
            model: routing.default_model || FALLBACK_MODEL,
            rationale,
            taskType
        })

    } catch (error) {
        console.error('Unexpected error in model routing:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
