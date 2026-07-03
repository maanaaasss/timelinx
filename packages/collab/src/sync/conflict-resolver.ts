/**
 * ConflictResolver
 *
 * Detects and resolves conflicts between concurrent operations.
 */

import type { Transaction } from '@timelinx/core';
import type {
  OperationLogEntry,
  Conflict,
  ConflictType,
  ConflictResolution,
} from '../types';

// ---------------------------------------------------------------------------
// ConflictResolver
// ---------------------------------------------------------------------------

export class ConflictResolver {
  private conflicts: Conflict[] = [];

  /**
   * Detect conflicts between two operations.
   */
  detectConflict(op1: OperationLogEntry, op2: OperationLogEntry): Conflict | null {
    // Same user operations don't conflict
    if (op1.userId === op2.userId) return null;

    // Check if they modify the same entities
    const conflictType = this.getConflictType(op1, op2);
    if (!conflictType) return null;

    return {
      id: `conflict-${op1.id}-${op2.id}`,
      op1,
      op2,
      type: conflictType,
      detectedAt: Date.now(),
    };
  }

  /**
   * Find all conflicts in a set of operations.
   */
  findConflicts(entries: OperationLogEntry[]): Conflict[] {
    const conflicts: Conflict[] = [];

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const conflict = this.detectConflict(entries[i], entries[j]);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    this.conflicts = conflicts;
    return conflicts;
  }

  /**
   * Get all detected conflicts.
   */
  getConflicts(): readonly Conflict[] {
    return this.conflicts;
  }

  /**
   * Resolve a conflict using a strategy.
   */
  resolve(
    conflict: Conflict,
    strategy: ConflictResolution,
  ): Transaction {
    switch (strategy.type) {
      case 'last-writer-wins':
        return this.resolveLastWriterWins(conflict);
      case 'first-writer-wins':
        return this.resolveFirstWriterWins(conflict);
      case 'manual':
        return strategy.resolvedTransaction;
      case 'merge':
        return strategy.mergedTransaction;
    }
  }

  /**
   * Auto-resolve all conflicts using last-writer-wins.
   */
  autoResolve(entries: OperationLogEntry[]): OperationLogEntry[] {
    const conflicts = this.findConflicts(entries);
    const resolvedIds = new Set<string>();

    for (const conflict of conflicts) {
      // Resolve by keeping the later operation, marking the loser
      const loser =
        conflict.op1.timestamp > conflict.op2.timestamp
          ? conflict.op2
          : conflict.op1;
      resolvedIds.add(loser.id);
    }

    // Filter out resolved operations
    return entries.filter((e) => !resolvedIds.has(e.id));
  }

  /**
   * Determine conflict type between two operations.
   */
  private getConflictType(
    op1: OperationLogEntry,
    op2: OperationLogEntry,
  ): ConflictType | null {
    const ops1 = op1.transaction.operations;
    const ops2 = op2.transaction.operations;

    for (const a of ops1) {
      for (const b of ops2) {
        // Same clip operations
        if ('clipId' in a && 'clipId' in b) {
          if (a.clipId === b.clipId) {
            if (a.type === 'DELETE_CLIP' || b.type === 'DELETE_CLIP') {
              return 'concurrent-delete';
            }
            if (a.type !== b.type) {
              return 'concurrent-modify';
            }
            if (a.type === 'MOVE_CLIP' && b.type === 'MOVE_CLIP') {
              return 'concurrent-move';
            }
          }
        }

        // Same track operations
        if ('trackId' in a && 'trackId' in b) {
          if (a.trackId === b.trackId && a.type === b.type) {
            return 'order-conflict';
          }
        }
      }
    }

    return null;
  }

  /**
   * Resolve by keeping the later operation.
   */
  private resolveLastWriterWins(conflict: Conflict): Transaction {
    return conflict.op1.timestamp > conflict.op2.timestamp
      ? conflict.op1.transaction
      : conflict.op2.transaction;
  }

  /**
   * Resolve by keeping the earlier operation.
   */
  private resolveFirstWriterWins(conflict: Conflict): Transaction {
    return conflict.op1.timestamp < conflict.op2.timestamp
      ? conflict.op1.transaction
      : conflict.op2.transaction;
  }

  /**
   * Clear all conflicts.
   */
  clear(): void {
    this.conflicts = [];
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createConflictResolver(): ConflictResolver {
  return new ConflictResolver();
}
