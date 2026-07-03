/**
 * CRDTSyncManager
 *
 * CRDT-based state synchronization for collaborative editing.
 * Uses operation-based CRDT for timeline state.
 */

import type { Transaction } from '@timelinx/core';
import type {
  CRDTOperation,
  CRDTState,
  VectorClock,
  ISyncAdapter,
} from '../types';

// ---------------------------------------------------------------------------
// CRDTSyncManager
// ---------------------------------------------------------------------------

export class CRDTSyncManager {
  private state: {
    documentId: string;
    operations: CRDTOperation[];
    vectorClock: VectorClock;
    lastModified: number;
  };
  private userId: string;
  private pendingOperations: CRDTOperation[] = [];
  private appliedOperationIds = new Set<string>();
  private syncAdapter: ISyncAdapter | null = null;
  private stateChangeCallback: ((state: CRDTState) => void) | null = null;

  constructor(documentId: string, userId: string) {
    this.userId = userId;
    this.state = {
      documentId,
      operations: [],
      vectorClock: { [userId]: 0 },
      lastModified: Date.now(),
    };
  }

  /**
   * Set sync adapter for real-time collaboration.
   */
  setSyncAdapter(adapter: ISyncAdapter): void {
    this.removeSyncAdapter();
    this.syncAdapter = adapter;

    // Listen for incoming operations
    adapter.onOperation((op) => this.receiveOperation(op));
  }

  /**
   * Remove sync adapter and clean up listener.
   */
  removeSyncAdapter(): void {
    if (this.syncAdapter) {
      this.syncAdapter = null;
    }
  }

  /**
   * Set state change callback.
   */
  onStateChange(callback: (state: CRDTState) => void): void {
    this.stateChangeCallback = callback;
  }

  /**
   * Get current state.
   */
  getState(): CRDTState {
    return {
      ...this.state,
      operations: [...this.state.operations],
      vectorClock: { ...this.state.vectorClock },
    };
  }

  /**
   * Create and apply a local operation.
   */
  applyLocalOperation(transaction: Transaction): CRDTOperation {
    // Increment local clock
    this.state.vectorClock[this.userId] =
      (this.state.vectorClock[this.userId] || 0) + 1;

    const operation: CRDTOperation = {
      id: `${this.userId}-${this.state.vectorClock[this.userId]}`,
      userId: this.userId,
      operation: transaction,
      timestamp: Date.now(),
      dependencies: this.getDependencies(),
    };

    // Apply locally
    this.applyOperation(operation);

    // Send to sync adapter
    if (this.syncAdapter) {
      this.syncAdapter.sendOperation(operation);
    }

    return operation;
  }

  /**
   * Receive an operation from another user.
   */
  receiveOperation(operation: CRDTOperation): void {
    // Skip if already applied
    if (this.appliedOperationIds.has(operation.id)) {
      return;
    }

    // Buffer if we're missing dependencies
    if (!this.dependenciesSatisfied(operation)) {
      this.pendingOperations.push(operation);
      return;
    }

    // Apply operation
    this.applyOperation(operation);

    // Try to apply pending operations
    this.processPendingOperations();
  }

  /**
   * Apply an operation to state.
   */
  private applyOperation(operation: CRDTOperation): void {
    // Mark as applied
    this.appliedOperationIds.add(operation.id);

    // Add to operations list
    this.state.operations.push(operation);

    // Update vector clock from the operation's dependencies
    for (const depId of operation.dependencies) {
      // Parse user ID from dependency ID (format: userId-clock)
      const userId = depId.split('-')[0];
      if (userId) {
        // We don't have the exact clock value, but we know this dependency exists
        // The actual clock should be updated when we receive the operation
      }
    }

    // Update last modified
    this.state.lastModified = Date.now();

    // Notify listeners
    if (this.stateChangeCallback) {
      this.stateChangeCallback(this.getState());
    }
  }

  /**
   * Check if all dependencies are satisfied.
   */
  private dependenciesSatisfied(operation: CRDTOperation): boolean {
    return operation.dependencies.every((depId) =>
      this.appliedOperationIds.has(depId),
    );
  }

  /**
   * Get current dependencies (last operation from each user).
   */
  private getDependencies(): string[] {
    const deps: string[] = [];
    const lastByUser = new Map<string, string>();

    for (const op of this.state.operations) {
      const existing = lastByUser.get(op.userId);
      if (!existing || op.timestamp > this.state.operations.find(o => o.id === existing)!.timestamp) {
        lastByUser.set(op.userId, op.id);
      }
    }

    for (const depId of lastByUser.values()) {
      deps.push(depId);
    }

    return deps;
  }

  /**
   * Process pending operations.
   */
  private processPendingOperations(): void {
    const stillPending: CRDTOperation[] = [];

    for (const op of this.pendingOperations) {
      if (this.dependenciesSatisfied(op)) {
        this.applyOperation(op);
      } else {
        stillPending.push(op);
      }
    }

    this.pendingOperations = stillPending;
  }

  /**
   * Merge another CRDT state into this one.
   */
  merge(otherState: CRDTState): void {
    // Find operations in other that we don't have
    const newOperations = otherState.operations.filter(
      (op) => !this.appliedOperationIds.has(op.id),
    );

    // Sort by Lamport timestamp
    newOperations.sort((a, b) => a.timestamp - b.timestamp);

    // Apply each operation
    for (const op of newOperations) {
      this.receiveOperation(op);
    }
  }

  /**
   * Check if two states are concurrent.
   */
  areConcurrent(other: CRDTState): boolean {
    const a = this.state.vectorClock;
    const b = other.vectorClock;

    let aGreater = false;
    let bGreater = false;

    for (const userId of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const aVal = a[userId] || 0;
      const bVal = b[userId] || 0;
      if (aVal > bVal) aGreater = true;
      if (bVal > aVal) bGreater = true;
    }

    return aGreater && bGreater;
  }

  /**
   * Get operations since a given vector clock.
   */
  getOperationsSince(since: VectorClock): CRDTOperation[] {
    return this.state.operations.filter((op) => {
      const opClock = { [op.userId]: op.timestamp };
      for (const [userId, clock] of Object.entries(since)) {
        if ((opClock[userId] || 0) <= clock) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Destroy the manager and release all references.
   */
  destroy(): void {
    this.removeSyncAdapter();
    this.stateChangeCallback = null;
    this.pendingOperations = [];
    this.appliedOperationIds.clear();
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createCRDTSyncManager(
  documentId: string,
  userId: string,
): CRDTSyncManager {
  return new CRDTSyncManager(documentId, userId);
}
