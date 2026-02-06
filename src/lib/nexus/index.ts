/**
 * NEXUS — Next-Gen Execution & Unified System
 *
 * Public API for the NEXUS orchestration engine.
 *
 * Usage:
 *   import { createNexusClient, NexusClient, NexusError } from '@/lib/nexus'
 *
 * DEA-042 | Phase 0 Foundation
 */

export {
  createNexusClient,
  NexusClient,
  NexusError,
  NexusLockConflictError,
  type NexusClientOptions,
} from './client'
