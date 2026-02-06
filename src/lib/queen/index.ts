/**
 * QUEEN Event Pipeline — Public API
 *
 * Usage:
 *   import { emitEvent, emitAgentEvent, processEvents } from '@/lib/queen'
 *
 * TASK-008 | Phase 1 Core Infrastructure
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
