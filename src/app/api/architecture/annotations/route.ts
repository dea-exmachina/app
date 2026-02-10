import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { ArchitectureAnnotation, AnnotationCreate } from '@/types/architecture'

/**
 * GET /api/architecture/annotations?target_id=xxx
 * Fetch annotations for a specific node/target
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ArchitectureAnnotation[]> | ApiError>> {
  try {
    const targetId = request.nextUrl.searchParams.get('target_id')

    let query = tables.architecture_annotations
      .select('*')
      .order('created_at', { ascending: false })

    if (targetId) {
      query = query.eq('target_id', targetId)
    }

    const { data, error } = await query

    if (error) throw error

    const annotations: ArchitectureAnnotation[] = (data ?? []).map(
      (row: Record<string, unknown>) => ({
        id: row.id as string,
        targetType: row.target_type as ArchitectureAnnotation['targetType'],
        targetId: row.target_id as string,
        targetTier: (row.target_tier as ArchitectureAnnotation['targetTier']) ?? undefined,
        annotationType: row.annotation_type as ArchitectureAnnotation['annotationType'],
        content: row.content as string,
        author: row.author as string,
        priority: (row.priority as ArchitectureAnnotation['priority']) ?? 'normal',
        resolved: (row.resolved as boolean) ?? false,
        resolvedBy: row.resolved_by as string | null,
        resolvedAt: row.resolved_at as string | null,
        metadata: row.metadata as Record<string, unknown> | undefined,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      })
    )

    return NextResponse.json({ data: annotations, cached: false })
  } catch (error) {
    console.error('Error fetching annotations:', error)
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Failed to fetch annotations' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/architecture/annotations
 * Create a new annotation
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ArchitectureAnnotation> | ApiError>> {
  try {
    const body: AnnotationCreate = await request.json()

    if (!body.targetType || !body.targetId || !body.annotationType || !body.content) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'targetType, targetId, annotationType, and content are required',
          },
        },
        { status: 400 }
      )
    }

    const { data: row, error } = await tables.architecture_annotations
      .insert({
        target_type: body.targetType,
        target_id: body.targetId,
        target_tier: body.targetTier ?? null,
        annotation_type: body.annotationType,
        content: body.content,
        author: body.author || 'dea',
        priority: body.priority ?? 'normal',
        resolved: false,
        metadata: body.metadata ?? null,
      })
      .select()
      .single()

    if (error) throw error

    const annotation: ArchitectureAnnotation = {
      id: row.id,
      targetType: row.target_type,
      targetId: row.target_id,
      targetTier: row.target_tier ?? undefined,
      annotationType: row.annotation_type,
      content: row.content,
      author: row.author,
      priority: row.priority ?? 'normal',
      resolved: row.resolved ?? false,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at,
      metadata: row.metadata ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }

    return NextResponse.json({ data: annotation, cached: false })
  } catch (error) {
    console.error('Error creating annotation:', error)
    return NextResponse.json(
      { error: { code: 'WRITE_ERROR', message: 'Failed to create annotation' } },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/architecture/annotations
 * Update annotation (resolve/unresolve, edit content)
 */
export async function PATCH(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ArchitectureAnnotation> | ApiError>> {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'id is required' } },
        { status: 400 }
      )
    }

    // Map camelCase to snake_case for DB
    const dbUpdates: Record<string, unknown> = {}
    if ('resolved' in updates) {
      dbUpdates.resolved = updates.resolved
      if (updates.resolved) {
        dbUpdates.resolved_by = updates.resolvedBy ?? 'dea'
        dbUpdates.resolved_at = new Date().toISOString()
      } else {
        dbUpdates.resolved_by = null
        dbUpdates.resolved_at = null
      }
    }
    if ('content' in updates) dbUpdates.content = updates.content
    if ('priority' in updates) dbUpdates.priority = updates.priority
    if ('annotationType' in updates) dbUpdates.annotation_type = updates.annotationType

    const { data: row, error } = await tables.architecture_annotations
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const annotation: ArchitectureAnnotation = {
      id: row.id,
      targetType: row.target_type,
      targetId: row.target_id,
      targetTier: row.target_tier ?? undefined,
      annotationType: row.annotation_type,
      content: row.content,
      author: row.author,
      priority: row.priority ?? 'normal',
      resolved: row.resolved ?? false,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at,
      metadata: row.metadata ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }

    return NextResponse.json({ data: annotation, cached: false })
  } catch (error) {
    console.error('Error updating annotation:', error)
    return NextResponse.json(
      { error: { code: 'WRITE_ERROR', message: 'Failed to update annotation' } },
      { status: 500 }
    )
  }
}
