/**
 * QUEEN Event Pipeline — Public API
 *
 * Usage:
 *   import { emitEvent, emitAgentEvent, processEvents } from '@/lib/queen'
 *   import { verifyWebhookSignature, getWebhookConfig } from '@/lib/queen'
 *   import { transformEntity, getConnector } from '@/lib/queen'
 *
 * TASK-008 | Phase 1 Core Infrastructure
 * TASK-009 | Phase 2 Integration Layer (webhook utilities)
 * TASK-010 | Phase 2 Entity Transformation Layer
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
