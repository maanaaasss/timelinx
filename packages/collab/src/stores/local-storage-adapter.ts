/**
 * LocalStorageAdapter
 *
 * Persistence adapter using localStorage for browser storage.
 */

import type {
  IStorageAdapter,
  OperationLogEntry,
  CRDTState,
  BranchingHistory,
  Comment,
  UserPresence,
} from '../types';

// ---------------------------------------------------------------------------
// LocalStorageAdapter
// ---------------------------------------------------------------------------

export class LocalStorageAdapter implements IStorageAdapter {
  private prefix: string;

  constructor(prefix: string = 'timelinx') {
    this.prefix = prefix;
  }

  /**
   * Check if localStorage is available.
   */
  private isLocalStorageAvailable(): boolean {
    try {
      const testKey = `${this.prefix}:test`;
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Safely set an item, handling QuotaExceededError.
   */
  private safeSetItem(key: string, value: string): void {
    if (!this.isLocalStorageAvailable()) return;
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn(`localStorage quota exceeded for key: ${key}`);
      }
      throw e;
    }
  }

  /**
   * Safely parse JSON, returning null on failure.
   */
  private safeParse<T>(data: string | null, fallback: T): T {
    if (!data) return fallback;
    try {
      return JSON.parse(data) as T;
    } catch {
      return fallback;
    }
  }

  /**
   * Save operation log.
   */
  async saveOperationLog(
    documentId: string,
    entries: OperationLogEntry[],
  ): Promise<void> {
    const key = this.getKey(documentId, 'operation-log');
    this.safeSetItem(key, JSON.stringify(entries));
  }

  /**
   * Load operation log.
   */
  async loadOperationLog(documentId: string): Promise<OperationLogEntry[]> {
    const key = this.getKey(documentId, 'operation-log');
    const data = localStorage.getItem(key);
    return this.safeParse<OperationLogEntry[]>(data, []);
  }

  /**
   * Save CRDT state.
   */
  async saveCRDTState(
    documentId: string,
    state: CRDTState,
  ): Promise<void> {
    const key = this.getKey(documentId, 'crdt-state');
    this.safeSetItem(key, JSON.stringify(state));
  }

  /**
   * Load CRDT state.
   */
  async loadCRDTState(documentId: string): Promise<CRDTState | null> {
    const key = this.getKey(documentId, 'crdt-state');
    const data = localStorage.getItem(key);
    return this.safeParse<CRDTState | null>(data, null);
  }

  /**
   * Save branching history.
   */
  async saveBranchingHistory(
    documentId: string,
    history: BranchingHistory,
  ): Promise<void> {
    const key = this.getKey(documentId, 'branching-history');
    this.safeSetItem(key, JSON.stringify(history));
  }

  /**
   * Load branching history.
   */
  async loadBranchingHistory(
    documentId: string,
  ): Promise<BranchingHistory | null> {
    const key = this.getKey(documentId, 'branching-history');
    const data = localStorage.getItem(key);
    return this.safeParse<BranchingHistory | null>(data, null);
  }

  /**
   * Save comments.
   */
  async saveComments(
    documentId: string,
    comments: Comment[],
  ): Promise<void> {
    const key = this.getKey(documentId, 'comments');
    this.safeSetItem(key, JSON.stringify(comments));
  }

  /**
   * Load comments.
   */
  async loadComments(documentId: string): Promise<Comment[]> {
    const key = this.getKey(documentId, 'comments');
    const data = localStorage.getItem(key);
    return this.safeParse<Comment[]>(data, []);
  }

  /**
   * Save user presences.
   */
  async savePresences(
    documentId: string,
    presences: UserPresence[],
  ): Promise<void> {
    const key = this.getKey(documentId, 'presences');
    this.safeSetItem(key, JSON.stringify(presences));
  }

  /**
   * Load user presences.
   */
  async loadPresences(documentId: string): Promise<UserPresence[]> {
    const key = this.getKey(documentId, 'presences');
    const data = localStorage.getItem(key);
    return this.safeParse<UserPresence[]>(data, []);
  }

  /**
   * Clear all data for a document.
   */
  async clearDocument(documentId: string): Promise<void> {
    const keys = [
      'operation-log',
      'crdt-state',
      'branching-history',
      'comments',
      'presences',
    ];

    for (const suffix of keys) {
      const key = this.getKey(documentId, suffix);
      localStorage.removeItem(key);
    }
  }

  /**
   * Get storage key.
   */
  private getKey(documentId: string, suffix: string): string {
    return `${this.prefix}:${documentId}:${suffix}`;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createLocalStorageAdapter(
  prefix?: string,
): LocalStorageAdapter {
  return new LocalStorageAdapter(prefix);
}
