/**
 * QUEEN Sync Engine — Public API
 *
 * Usage:
 *   import { processInboundEvent, processOutboundChange } from '@/lib/queen/sync'
 *   import { isSourceAllowed, getBreakerStatus } from '@/lib/queen/sync'
 *   import { getSyncState, listSyncStates } from '@/lib/queen/sync'
 *
 * TASK-011 | Phase 2 Bidirectional Sync Engine
 */

// Core engine operations
export {
  processInboundEvent,
  processOutboundChange,
  reconcile,
  triggerManualSync,
} from './engine'

// Sync state CRUD
export {
  getSyncState,
  getSyncStateByExternalId,
  getSyncStatesByInternalId,
  listSyncStates,
  upsertSyncState,
  updateSyncState,
  markConflict,
  markError,
  resolveConflict,
  type SyncStateCreate,
  type SyncStateUpdate,
  type SyncStateFilter,
} from './state'

// Circuit breaker
export {
  isSourceAllowed,
  recordSuccess,
  recordFailure,
  getBreakerStatus,
  getAllBreakerStatuses,
  configureBreaker,
  resetBreaker,
} from './circuit-breaker'
