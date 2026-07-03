/**
 * Collaboration types for Timelinx.
 *
 * Defines types for operation logs, conflict resolution,
 * CRDT sync, and multi-user editing.
 */

import type { Transaction, TimelineFrame } from '@timelinx/core';

// ---------------------------------------------------------------------------
// Operation Log
// ---------------------------------------------------------------------------

/**
 * A single entry in the operation log.
 */
export type OperationLogEntry = {
  /** Unique operation ID (vector clock component). */
  readonly id: string;
  /** User who performed the operation. */
  readonly userId: string;
  /** The transaction applied. */
  readonly transaction: Transaction;
  /** Timestamp when operation was performed. */
  readonly timestamp: number;
  /** Vector clock state at time of operation. */
  readonly vectorClock: VectorClock;
  /** Parent operation ID (for branching). */
  readonly parentId: string | null;
};

/**
 * Vector clock for tracking causality.
 */
export type VectorClock = Record<string, number>;

// ---------------------------------------------------------------------------
// Conflict Resolution
// ---------------------------------------------------------------------------

/**
 * Conflict type when operations overlap.
 */
export type ConflictType =
  | 'concurrent-delete'
  | 'concurrent-modify'
  | 'concurrent-move'
  | 'order-conflict';

/**
 * A detected conflict between operations.
 */
export type Conflict = {
  /** Unique conflict ID. */
  readonly id: string;
  /** First operation. */
  readonly op1: OperationLogEntry;
  /** Second operation. */
  readonly op2: OperationLogEntry;
  /** Type of conflict. */
  readonly type: ConflictType;
  /** Timestamp when conflict was detected. */
  readonly detectedAt: number;
};

/**
 * Resolution strategy for conflicts.
 */
export type ConflictResolution =
  | { type: 'last-writer-wins' }
  | { type: 'first-writer-wins' }
  | { type: 'manual'; resolvedTransaction: Transaction }
  | { type: 'merge'; mergedTransaction: Transaction };

// ---------------------------------------------------------------------------
// CRDT Sync
// ---------------------------------------------------------------------------

/**
 * CRDT operation for state-based replication.
 */
export type CRDTOperation = {
  /** Unique operation ID. */
  readonly id: string;
  /** User who created the operation. */
  readonly userId: string;
  /** The operation payload. */
  readonly operation: Transaction;
  /** Lamport timestamp. */
  readonly timestamp: number;
  /** Dependencies (operations this depends on). */
  readonly dependencies: string[];
};

/**
 * CRDT state for a document.
 */
export type CRDTState = {
  /** Document ID. */
  readonly documentId: string;
  /** All operations applied. */
  readonly operations: CRDTOperation[];
  /** Current vector clock. */
  readonly vectorClock: VectorClock;
  /** Last modified timestamp. */
  readonly lastModified: number;
};

// ---------------------------------------------------------------------------
// Multi-User
// ---------------------------------------------------------------------------

/**
 * User presence information.
 */
export type UserPresence = {
  /** User ID. */
  readonly userId: string;
  /** User display name. */
  readonly displayName: string;
  /** User color for cursors. */
  readonly color: string;
  /** Current cursor position. */
  readonly cursor: CursorPosition | null;
  /** Current selection. */
  readonly selection: UserSelection | null;
  /** Last heartbeat timestamp. */
  readonly lastHeartbeat: number;
  /** Is user currently active. */
  readonly isActive: boolean;
};

/**
 * Cursor position in the timeline.
 */
export type CursorPosition = {
  /** Frame position. */
  readonly frame: TimelineFrame;
  /** Track ID if on a track. */
  readonly trackId: string | null;
  /** X position in viewport. */
  readonly x: number;
  /** Y position in viewport. */
  readonly y: number;
};

/**
 * User's current selection.
 */
export type UserSelection = {
  /** Selected clip IDs. */
  readonly clipIds: string[];
  /** Selected marker IDs. */
  readonly markerIds: string[];
  /** Selected range (if any). */
  readonly range: { start: TimelineFrame; end: TimelineFrame } | null;
};

/**
 * A comment on the timeline.
 */
export type Comment = {
  /** Comment ID. */
  readonly id: string;
  /** User who created the comment. */
  readonly userId: string;
  /** Comment text. */
  readonly text: string;
  /** Frame position. */
  readonly frame: TimelineFrame;
  /** Track ID (optional). */
  readonly trackId: string | null;
  /** Thread ID (for replies). */
  readonly threadId: string | null;
  /** Timestamp. */
  readonly createdAt: number;
  /** Resolved status. */
  readonly resolved: boolean;
};

// ---------------------------------------------------------------------------
// Branching History
// ---------------------------------------------------------------------------

/**
 * A branch in the edit history.
 */
export type EditBranch = {
  /** Branch ID. */
  readonly id: string;
  /** Branch name. */
  readonly name: string;
  /** Parent branch ID (null for main). */
  readonly parentId: string | null;
  /** Operations unique to this branch. */
  readonly operations: string[];
  /** Created timestamp. */
  readonly createdAt: number;
  /** Created by user. */
  readonly createdBy: string;
};

/**
 * History state with branching support.
 */
export type BranchingHistory = {
  /** All branches. */
  readonly branches: EditBranch[];
  /** Current branch ID. */
  readonly currentBranchId: string;
  /** Operation log. */
  readonly operationLog: OperationLogEntry[];
};

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/**
 * Storage adapter interface for persistence.
 */
export interface IStorageAdapter {
  /** Save operation log. */
  saveOperationLog(documentId: string, entries: OperationLogEntry[]): Promise<void>;
  /** Load operation log. */
  loadOperationLog(documentId: string): Promise<OperationLogEntry[]>;
  /** Save CRDT state. */
  saveCRDTState(documentId: string, state: CRDTState): Promise<void>;
  /** Load CRDT state. */
  loadCRDTState(documentId: string): Promise<CRDTState | null>;
  /** Save branching history. */
  saveBranchingHistory(documentId: string, history: BranchingHistory): Promise<void>;
  /** Load branching history. */
  loadBranchingHistory(documentId: string): Promise<BranchingHistory | null>;
  /** Save comments. */
  saveComments(documentId: string, comments: Comment[]): Promise<void>;
  /** Load comments. */
  loadComments(documentId: string): Promise<Comment[]>;
  /** Save user presences. */
  savePresences(documentId: string, presences: UserPresence[]): Promise<void>;
  /** Load user presences. */
  loadPresences(documentId: string): Promise<UserPresence[]>;
}

/**
 * Sync adapter interface for real-time collaboration.
 */
export interface ISyncAdapter {
  /** Connect to sync server. */
  connect(documentId: string, userId: string): Promise<void>;
  /** Disconnect from sync server. */
  disconnect(): void;
  /** Send operation to other users. */
  sendOperation(operation: CRDTOperation): void;
  /** Receive operation from other users. */
  onOperation(callback: (operation: CRDTOperation) => void): void;
  /** Send presence update. */
  sendPresence(presence: UserPresence): void;
  /** Receive presence updates. */
  onPresence(callback: (presence: UserPresence) => void): void;
  /** Send comment. */
  sendComment(comment: Comment): void;
  /** Receive comments. */
  onComment(callback: (comment: Comment) => void): void;
}
