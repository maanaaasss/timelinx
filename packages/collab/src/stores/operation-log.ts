/**
 * OperationLogStore
 *
 * Manages the operation log for tracking all mutations.
 * Supports persistence via storage adapters.
 */

import type { Transaction } from '@timelinx/core';
import type {
  OperationLogEntry,
  VectorClock,
  IStorageAdapter,
} from '../types';

// ---------------------------------------------------------------------------
// OperationLogStore
// ---------------------------------------------------------------------------

export class OperationLogStore {
  private entries: OperationLogEntry[] = [];
  private entryIndex: Map<string, OperationLogEntry> = new Map();
  private documentId: string;
  private userId: string;
  private vectorClock: VectorClock = {};
  private storageAdapter: IStorageAdapter | null = null;

  constructor(documentId: string, userId: string) {
    this.documentId = documentId;
    this.userId = userId;
    this.vectorClock[userId] = 0;
  }

  /**
   * Set storage adapter for persistence.
   */
  setStorageAdapter(adapter: IStorageAdapter): void {
    this.storageAdapter = adapter;
  }

  /**
   * Get current vector clock.
   */
  getVectorClock(): VectorClock {
    return { ...this.vectorClock };
  }

  /**
   * Add a transaction to the log.
   */
  addEntry(
    transaction: Transaction,
    parentId: string | null = null,
  ): OperationLogEntry {
    // Increment local clock
    this.vectorClock[this.userId] = (this.vectorClock[this.userId] || 0) + 1;

    const entry: OperationLogEntry = {
      id: `${this.userId}-${this.vectorClock[this.userId]}`,
      userId: this.userId,
      transaction,
      timestamp: Date.now(),
      vectorClock: { ...this.vectorClock },
      parentId,
    };

    this.entries.push(entry);
    this.entryIndex.set(entry.id, entry);
    return entry;
  }

  /**
   * Get all entries.
   */
  getEntries(): readonly OperationLogEntry[] {
    return this.entries;
  }

  /**
   * Get entries by user.
   */
  getEntriesByUser(userId: string): readonly OperationLogEntry[] {
    return this.entries.filter((e) => e.userId === userId);
  }

  /**
   * Get entries in time range.
   */
  getEntriesInRange(start: number, end: number): readonly OperationLogEntry[] {
    return this.entries.filter(
      (e) => e.timestamp >= start && e.timestamp <= end,
    );
  }

  /**
   * Get entry by ID.
   */
  getEntryById(id: string): OperationLogEntry | undefined {
    return this.entryIndex.get(id);
  }

  /**
   * Check if operation A happened-before operation B.
   */
  happenedBefore(a: OperationLogEntry, b: OperationLogEntry): boolean {
    // A happened-before B if A's clock is <= B's clock for all components
    // and strictly < for at least one component
    let hasLess = false;
    const aClock = a.vectorClock;
    const bClock = b.vectorClock;

    for (const userId of Object.keys(aClock)) {
      const aVal = aClock[userId] || 0;
      const bVal = bClock[userId] || 0;
      if (aVal > bVal) return false;
      if (aVal < bVal) hasLess = true;
    }

    // Also check if B has any users not in A
    for (const userId of Object.keys(bClock)) {
      if (!(userId in aClock)) {
        hasLess = true;
      }
    }

    return hasLess;
  }

  /**
   * Check if two operations are concurrent.
   */
  areConcurrent(a: OperationLogEntry, b: OperationLogEntry): boolean {
    return !this.happenedBefore(a, b) && !this.happenedBefore(b, a);
  }

  /**
   * Merge another operation log into this one.
   */
  merge(otherEntries: OperationLogEntry[]): void {
    for (const entry of otherEntries) {
      if (!this.entries.some((e) => e.id === entry.id)) {
        this.entries.push(entry);
        this.entryIndex.set(entry.id, entry);
        // Update vector clock
        for (const [userId, clock] of Object.entries(entry.vectorClock)) {
          this.vectorClock[userId] = Math.max(
            this.vectorClock[userId] || 0,
            clock,
          );
        }
      }
    }
    // Sort by timestamp
    this.entries.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Save to storage.
   */
  async save(): Promise<void> {
    if (this.storageAdapter) {
      await this.storageAdapter.saveOperationLog(
        this.documentId,
        [...this.entries],
      );
    }
  }

  /**
   * Load from storage.
   */
  async load(): Promise<void> {
    if (this.storageAdapter) {
      const entries = await this.storageAdapter.loadOperationLog(
        this.documentId,
      );
      this.merge(entries);
    }
  }

  /**
   * Get causal history of an operation.
   */
  getCausalHistory(entryId: string): OperationLogEntry[] {
    const history: OperationLogEntry[] = [];
    const visited = new Set<string>();

    const traverse = (id: string | null) => {
      if (!id || visited.has(id)) return;
      visited.add(id);

      const entry = this.getEntryById(id);
      if (entry) {
        history.unshift(entry);
        traverse(entry.parentId);
      }
    };

    traverse(entryId);
    return history;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createOperationLogStore(
  documentId: string,
  userId: string,
): OperationLogStore {
  return new OperationLogStore(documentId, userId);
}
