/**
 * Jira Connector — Entity transformation for Jira webhook payloads
 *
 * Maps Jira issue payloads to the canonical InternalEntity format.
 * Handles both Jira Cloud and Jira Server webhook structures.
 *
 * Jira webhook payload structure (issue events):
 * {
 *   webhookEvent: "jira:issue_created",
 *   issue: {
 *     id: "10001",
 *     key: "PROJ-123",
 *     self: "https://yoursite.atlassian.net/rest/api/2/issue/10001",
 *     fields: {
 *       summary: "Bug in login flow",
 *       description: "When clicking login...",
 *       status: { name: "To Do", id: "1" },
 *       priority: { name: "High", id: "2" },
 *       assignee: { displayName: "John", emailAddress: "john@..." },
 *       reporter: { displayName: "Jane", emailAddress: "jane@..." },
 *       labels: ["bug", "frontend"],
 *       components: [{ name: "Auth" }],
 *       project: { key: "PROJ", name: "My Project" },
 *       created: "2026-01-15T10:00:00.000+0000",
 *       updated: "2026-02-06T14:30:00.000+0000",
 *     }
 *   }
 * }
 *
 * Field mapping (Jira -> InternalEntity):
 *   issue.key              -> external_id
 *   "jira"                 -> source
 *   fields.summary         -> title
 *   fields.description     -> description
 *   fields.status.name     -> raw_status (then mapped via status_map -> status)
 *   fields.priority.name   -> raw_priority (then normalized -> priority)
 *   fields.labels + fields.components[].name -> tags
 *   fields.assignee.displayName -> assignee
 *   fields.reporter.displayName -> reporter
 *   fields.project.key     -> project
 *   issue.self (derived)   -> url
 *   fields.created         -> external_created_at
 *   fields.updated         -> external_updated_at
 *
 * TASK-010 | Phase 2 Entity Transformation Layer
 */

import type {
  InternalEntity,
  InternalPriority,
  ExtractionResult,
  TransformConfig,
  TransformMeta,
} from '@/types/queen'
import type { EntityConnector } from './types'
import { getNestedField } from '../webhooks'

// ── Constants ───────────────────────────────────────────────

const CONNECTOR_NAME = 'jira'

/**
 * Default Jira field paths. TransformConfig can override these.
 * These match the standard Jira Cloud webhook payload structure.
 */
const DEFAULT_FIELD_PATHS = {
  title: 'issue.fields.summary',
  description: 'issue.fields.description',
  status: 'issue.fields.status.name',
  priority: 'issue.fields.priority.name',
  assignee: 'issue.fields.assignee.displayName',
  reporter: 'issue.fields.reporter.displayName',
  project: 'issue.fields.project.key',
  created: 'issue.fields.created',
  updated: 'issue.fields.updated',
  external_id: 'issue.key',
  issue_self: 'issue.self',
} as const

/**
 * Jira priority names -> internal priority levels.
 * Jira has 5 default priorities; we map them to our 5-level scale.
 */
const PRIORITY_MAP: Record<string, InternalPriority> = {
  'Highest': 'critical',
  'High': 'high',
  'Medium': 'medium',
  'Low': 'low',
  'Lowest': 'none',
  // Common custom priority names
  'Blocker': 'critical',
  'Critical': 'critical',
  'Major': 'high',
  'Minor': 'low',
  'Trivial': 'none',
}

/**
 * Default Jira-to-internal status mapping.
 * Used when no status_map is provided in TransformConfig.
 */
const DEFAULT_STATUS_MAP: Record<string, string> = {
  'To Do': 'proposed',
  'Backlog': 'proposed',
  'Selected for Development': 'proposed',
  'In Progress': 'executing',
  'In Review': 'executing',
  'Done': 'integrated',
  'Closed': 'integrated',
  'Resolved': 'integrated',
}

// ── Helper Functions ─────────────────────────────────────────

/**
 * Safely extract a string field from the payload.
 * Returns undefined and adds a warning if the field exists but is wrong type.
 */
function extractString(
  payload: Record<string, unknown>,
  path: string,
  fieldName: string,
  warnings: string[]
): string | undefined {
  const value = getNestedField(payload, path)

  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value !== 'string') {
    warnings.push(`${fieldName}: expected string at "${path}", got ${typeof value}`)
    // Try to coerce to string if it's a primitive
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }
    return undefined
  }

  return value
}

/**
 * Extract Jira labels and component names into a flat string array.
 * Handles both `fields.labels` (string[]) and `fields.components` ([{name}]).
 */
function extractTags(
  payload: Record<string, unknown>,
  config: TransformConfig,
  warnings: string[]
): string[] {
  const tags: string[] = []

  // Use config tag_fields if provided, otherwise use Jira defaults
  const tagPaths = config.tag_fields && config.tag_fields.length > 0
    ? config.tag_fields
    : ['issue.fields.labels', 'issue.fields.components']

  for (const path of tagPaths) {
    const value = getNestedField(payload, path)

    if (value === undefined || value === null) continue

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') {
          tags.push(item)
        } else if (item && typeof item === 'object' && 'name' in item) {
          // Jira components: [{ name: "Auth" }]
          const name = (item as Record<string, unknown>).name
          if (typeof name === 'string') {
            tags.push(name)
          }
        }
      }
    } else if (typeof value === 'string') {
      tags.push(value)
    } else {
      warnings.push(`tags: unexpected type at "${path}", got ${typeof value}`)
    }
  }

  return tags
}

/**
 * Build a browsable URL for a Jira issue from the self link.
 * self link format: https://yoursite.atlassian.net/rest/api/2/issue/10001
 * Browse URL format: https://yoursite.atlassian.net/browse/PROJ-123
 */
function buildBrowseUrl(selfLink: string | undefined, issueKey: string | undefined): string | undefined {
  if (!selfLink || !issueKey) return undefined

  try {
    const url = new URL(selfLink)
    return `${url.origin}/browse/${issueKey}`
  } catch {
    return undefined
  }
}

// ── Connector Implementation ──────────────────────────────────

export const jiraConnector: EntityConnector = {
  name: CONNECTOR_NAME,
  description: 'Transforms Jira Cloud/Server webhook issue payloads to internal entities',

  canHandle(payload: Record<string, unknown>): boolean {
    // Jira webhooks have a `webhookEvent` field starting with "jira:"
    // and an `issue` object at the top level
    const webhookEvent = payload.webhookEvent
    if (typeof webhookEvent === 'string' && webhookEvent.startsWith('jira:')) {
      return true
    }

    // Fallback: check for Jira-specific structure (issue with key and fields)
    const issue = payload.issue
    if (issue && typeof issue === 'object') {
      const issueObj = issue as Record<string, unknown>
      return typeof issueObj.key === 'string' && issueObj.fields !== undefined
    }

    return false
  },

  extract(
    payload: Record<string, unknown>,
    config: TransformConfig
  ): ExtractionResult {
    const warnings: string[] = []
    const errors: string[] = []

    // ── Extract external_id (required) ──
    const externalId = extractString(
      payload,
      DEFAULT_FIELD_PATHS.external_id,
      'external_id',
      warnings
    )

    if (!externalId) {
      // Try fallback: issue.id as string
      const issueId = getNestedField(payload, 'issue.id')
      if (issueId !== undefined && issueId !== null) {
        // We can use id, but warn that key was missing
        warnings.push('external_id: issue.key not found, falling back to issue.id')
        const fallbackId = String(issueId)
        return buildExtractionResult(payload, config, fallbackId, warnings, errors)
      }

      errors.push('external_id: neither issue.key nor issue.id found in payload')
      return { success: false, errors }
    }

    return buildExtractionResult(payload, config, externalId, warnings, errors)
  },

  transform(
    entity: InternalEntity,
    config: TransformConfig
  ): InternalEntity {
    // ── Status mapping ──
    if (entity.raw_status) {
      const statusMap = config.status_map && Object.keys(config.status_map).length > 0
        ? config.status_map
        : DEFAULT_STATUS_MAP

      const mappedStatus = statusMap[entity.raw_status]
      if (mappedStatus) {
        entity.status = mappedStatus
      } else {
        entity._meta.warnings.push(
          `status: no mapping found for "${entity.raw_status}". ` +
          `Available mappings: ${Object.keys(statusMap).join(', ')}`
        )
      }
    }

    // ── Priority normalization ──
    if (entity.raw_priority) {
      const normalized = PRIORITY_MAP[entity.raw_priority]
      if (normalized) {
        entity.priority = normalized
      } else {
        // Unknown priority — default to medium, warn
        entity.priority = 'medium'
        entity._meta.warnings.push(
          `priority: unknown value "${entity.raw_priority}", defaulted to "medium"`
        )
      }
    }

    // ── Update partial flag ──
    entity._meta.partial = entity._meta.warnings.length > 0

    return entity
  },
}

/**
 * Internal helper — builds the full ExtractionResult from a validated external_id.
 * Separated to avoid duplication between the primary and fallback paths.
 */
function buildExtractionResult(
  payload: Record<string, unknown>,
  config: TransformConfig,
  externalId: string,
  warnings: string[],
  errors: string[]
): ExtractionResult {
  // ── Extract title ──
  const titlePath = config.title_field || DEFAULT_FIELD_PATHS.title
  const title = extractString(payload, titlePath, 'title', warnings)
  if (!title) {
    warnings.push(`title: not found at "${titlePath}"`)
  }

  // ── Extract description ──
  const descPath = config.description_field || DEFAULT_FIELD_PATHS.description
  const description = extractString(payload, descPath, 'description', warnings)

  // ── Extract raw status ──
  const rawStatus = extractString(
    payload,
    DEFAULT_FIELD_PATHS.status,
    'status',
    warnings
  )

  // ── Extract raw priority ──
  const priorityPath = config.priority_field || DEFAULT_FIELD_PATHS.priority
  const rawPriority = extractString(payload, priorityPath, 'priority', warnings)

  // ── Extract tags ──
  const tags = extractTags(payload, config, warnings)

  // ── Extract assignee ──
  const assignee = extractString(
    payload,
    DEFAULT_FIELD_PATHS.assignee,
    'assignee',
    warnings
  )

  // ── Extract reporter ──
  const reporter = extractString(
    payload,
    DEFAULT_FIELD_PATHS.reporter,
    'reporter',
    warnings
  )

  // ── Extract project ──
  const project = extractString(
    payload,
    DEFAULT_FIELD_PATHS.project,
    'project',
    warnings
  )

  // ── Extract timestamps ──
  const createdAt = extractString(
    payload,
    DEFAULT_FIELD_PATHS.created,
    'created',
    warnings
  )
  const updatedAt = extractString(
    payload,
    DEFAULT_FIELD_PATHS.updated,
    'updated',
    warnings
  )

  // ── Build URL ──
  const selfLink = extractString(
    payload,
    DEFAULT_FIELD_PATHS.issue_self,
    'self',
    warnings
  )
  const url = buildBrowseUrl(selfLink, externalId)

  // ── Build metadata ──
  const meta: TransformMeta = {
    connector: CONNECTOR_NAME,
    transformed_at: new Date().toISOString(),
    warnings: [...warnings],
    partial: warnings.length > 0,
  }

  const entity: InternalEntity = {
    external_id: externalId,
    source: CONNECTOR_NAME,
    title,
    description: description || undefined,
    raw_status: rawStatus,
    raw_priority: rawPriority || undefined,
    tags: tags.length > 0 ? tags : undefined,
    assignee: assignee || undefined,
    reporter: reporter || undefined,
    project: project || undefined,
    url,
    external_created_at: createdAt || undefined,
    external_updated_at: updatedAt || undefined,
    internal_type: 'kanban_card',
    _meta: meta,
  }

  return {
    success: true,
    entity,
    errors,
  }
}
