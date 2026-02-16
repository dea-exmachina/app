/**
 * CREEP Event Pipeline — Public API
 *
 * Usage:
 *   import { emitEvent, emitAgentEvent, processEvents } from '@/lib/creep'
 *   import { verifyWebhookSignature, getWebhookConfig } from '@/lib/creep'
 *   import { transformEntity, getConnector } from '@/lib/creep'
 *   import { processInboundEvent, processOutboundChange } from '@/lib/creep/sync'
 *
 * TASK-008 | Phase 1 Core Infrastructure
 * TASK-009 | Phase 2 Integration Layer (webhook utilities)
 * TASK-010 | Phase 2 Entity Transformation Layer
 * TASK-011 | Phase 2 Bidirectional Sync Engine
 */

// Event normalization & validation
export {
  EVENT_TYPES,
  VALID_SOURCES,
  validateEventType,
  validateSource,
  generateTraceId,
  createEvent,
  type ValidSource,
  type EventValidationError,
  type EventValidationResult,
} from './events'

// Event emitter
export {
  emitEvent,
  emitBatch,
  emitAgentEvent,
  emitTaskEvent,
  emitGitEvent,
  EventEmitError,
} from './emitter'

// Event consumer & processing
export {
  registerConsumer,
  unregisterConsumer,
  getRegisteredConsumers,
  getConsumers,
  processEvents,
  replayDLQEvent,
  type EventConsumer,
  type EventConsumerFilter,
  type EventConsumerOptions,
  type ProcessResult,
} from './consumer'

// Webhook utilities
export {
  verifyWebhookSignature,
  extractSignature,
  getNestedField,
  transformWebhookPayload,
  getWebhookConfig,
  type WebhookTransformResult,
} from './webhooks'

// Entity transformation pipeline (TASK-010)
export {
  transformEntity,
  transformWebhookEvent,
} from './transform'

// Connector registry (TASK-010)
export {
  registerConnector,
  unregisterConnector,
  getConnector,
  findConnectorForPayload,
  listConnectors,
  hasConnector,
  jiraConnector,
  type EntityConnector,
  type ConnectorRegistryEntry,
} from './connectors'

// Sync engine (TASK-011)
// Note: Sync module has its own barrel at '@/lib/creep/sync' for
// direct import when you need the full sync API. The re-exports below
// provide the most-used operations at the top-level '@/lib/creep' path.
export {
  processInboundEvent,
  processOutboundChange,
  reconcile,
  triggerManualSync,
} from './sync'

export {
  isSourceAllowed,
  getBreakerStatus,
  getAllBreakerStatuses,
  configureBreaker,
  resetBreaker,
} from './sync'

export {
  getSyncState,
  getSyncStateByExternalId,
  listSyncStates,
  upsertSyncState,
  resolveConflict,
  type SyncStateCreate,
  type SyncStateFilter,
} from './sync'
