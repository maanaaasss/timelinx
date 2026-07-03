/**
 * @timelinx/collab - Collaboration Layer for Timelinx
 *
 * Provides operation-log persistence, conflict resolution,
 * CRDT sync, multi-user cursors, and branching history.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type {
  OperationLogEntry,
  VectorClock,
  Conflict,
  ConflictType,
  ConflictResolution,
  CRDTOperation,
  CRDTState,
  UserPresence,
  CursorPosition,
  UserSelection,
  Comment,
  EditBranch,
  BranchingHistory,
  IStorageAdapter,
  ISyncAdapter,
} from './types';

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------
export {
  OperationLogStore,
  createOperationLogStore,
} from './stores/operation-log';

export {
  BranchingHistoryStore,
  createBranchingHistoryStore,
} from './stores/branching-history';

export {
  PresenceManager,
  createPresenceManager,
} from './stores/presence-manager';

export {
  CommentManager,
  createCommentManager,
} from './stores/comment-manager';

export {
  LocalStorageAdapter,
  createLocalStorageAdapter,
} from './stores/local-storage-adapter';

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------
export {
  ConflictResolver,
  createConflictResolver,
} from './sync/conflict-resolver';

export {
  CRDTSyncManager,
  createCRDTSyncManager,
} from './sync/crdt-sync';
