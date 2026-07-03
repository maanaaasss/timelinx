/**
 * BranchingHistoryStore
 *
 * Manages branching edit history for timeline.
 * Supports creating branches, merging, and navigating history.
 */

import type { Transaction } from '@timelinx/core';
import type {
  EditBranch,
  BranchingHistory,
  OperationLogEntry,
} from '../types';

// ---------------------------------------------------------------------------
// BranchingHistoryStore
// ---------------------------------------------------------------------------

const MAIN_BRANCH_ID = 'main';

export class BranchingHistoryStore {
  private history: {
    branches: EditBranch[];
    currentBranchId: string;
    operationLog: OperationLogEntry[];
  };
  private branchIdCounter = 0;

  constructor(userId: string) {
    this.history = {
      branches: [
        {
          id: MAIN_BRANCH_ID,
          name: 'Main',
          parentId: null,
          operations: [],
          createdAt: Date.now(),
          createdBy: userId,
        },
      ],
      currentBranchId: MAIN_BRANCH_ID,
      operationLog: [],
    };
  }

  /**
   * Get current branch.
   */
  getCurrentBranch(): EditBranch {
    return this.history.branches.find(
      (b) => b.id === this.history.currentBranchId,
    )!;
  }

  /**
   * Get all branches.
   */
  getBranches(): readonly EditBranch[] {
    return this.history.branches;
  }

  /**
   * Get operation log.
   */
  getOperationLog(): readonly OperationLogEntry[] {
    return this.history.operationLog;
  }

  /**
   * Add an operation to the current branch.
   */
  addOperation(entry: OperationLogEntry): void {
    this.history.operationLog.push(entry);
    const branch = this.getCurrentBranch();
    branch.operations.push(entry.id);
  }

  /**
   * Create a new branch from current position.
   */
  createBranch(
    name: string,
    userId: string,
    fromBranchId?: string,
  ): EditBranch {
    const parentId = fromBranchId || this.history.currentBranchId;
    const parent = this.history.branches.find((b) => b.id === parentId);

    if (!parent) {
      throw new Error(`Parent branch not found: ${parentId}`);
    }

    const newBranch: EditBranch = {
      id: `branch-${Date.now()}-${++this.branchIdCounter}`,
      name,
      parentId,
      operations: [...parent.operations],
      createdAt: Date.now(),
      createdBy: userId,
    };

    this.history.branches.push(newBranch);
    return newBranch;
  }

  /**
   * Switch to a different branch.
   */
  switchBranch(branchId: string): void {
    const branch = this.history.branches.find((b) => b.id === branchId);
    if (!branch) {
      throw new Error(`Branch not found: ${branchId}`);
    }
    this.history.currentBranchId = branchId;
  }

  /**
   * Merge a branch into the current branch.
   */
  mergeBranch(sourceBranchId: string): Transaction[] {
    const source = this.history.branches.find((b) => b.id === sourceBranchId);
    if (!source) {
      throw new Error(`Source branch not found: ${sourceBranchId}`);
    }

    const current = this.getCurrentBranch();

    // Find operations in source that are not in current
    const newOperationIds = source.operations.filter(
      (opId) => !current.operations.includes(opId),
    );

    // Get the actual operations
    const newOperations = this.history.operationLog.filter(
      (entry) => newOperationIds.includes(entry.id),
    );

    // Add to current branch (create new array to avoid mutation)
    const updatedCurrent: EditBranch = {
      ...current,
      operations: [...current.operations, ...newOperationIds],
    };
    const currentIndex = this.history.branches.findIndex(
      (b) => b.id === current.id,
    );
    this.history.branches[currentIndex] = updatedCurrent;

    // Return the transactions to apply
    return newOperations.map((entry) => entry.transaction);
  }

  /**
   * Get history for a specific branch.
   */
  getBranchHistory(branchId: string): OperationLogEntry[] {
    const branch = this.history.branches.find((b) => b.id === branchId);
    if (!branch) {
      return [];
    }

    const operationSet = new Set(branch.operations);
    return this.history.operationLog.filter((entry) =>
      operationSet.has(entry.id),
    );
  }

  /**
   * Get ancestor branches (parent chain).
   */
  getAncestors(branchId: string): EditBranch[] {
    const ancestors: EditBranch[] = [];
    const visited = new Set<string>();

    const traverse = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const branch = this.history.branches.find((b) => b.id === id);
      if (branch) {
        ancestors.unshift(branch);
        if (branch.parentId) {
          traverse(branch.parentId);
        }
      }
    };

    traverse(branchId);
    return ancestors;
  }

  /**
   * Check if a branch is an ancestor of another.
   */
  isAncestor(ancestorId: string, descendantId: string): boolean {
    const ancestors = this.getAncestors(descendantId);
    return ancestors.some((b) => b.id === ancestorId);
  }

  /**
   * Get the common ancestor of two branches.
   */
  getCommonAncestor(branch1Id: string, branch2Id: string): EditBranch | null {
    const ancestors1 = this.getAncestors(branch1Id);
    const ancestors2 = this.getAncestors(branch2Id);

    // Find the last common ancestor
    for (let i = ancestors1.length - 1; i >= 0; i--) {
      if (ancestors2.some((b) => b.id === ancestors1[i].id)) {
        return ancestors1[i];
      }
    }

    return null;
  }

  /**
   * Delete a branch (cannot delete main or current).
   */
  deleteBranch(branchId: string): void {
    if (branchId === MAIN_BRANCH_ID) {
      throw new Error('Cannot delete main branch');
    }
    if (branchId === this.history.currentBranchId) {
      throw new Error('Cannot delete current branch');
    }

    const branch = this.history.branches.find((b) => b.id === branchId);
    if (!branch) {
      throw new Error(`Branch not found: ${branchId}`);
    }

    // Check if any other branch has this as parent
    const hasChildren = this.history.branches.some(
      (b) => b.parentId === branchId,
    );
    if (hasChildren) {
      throw new Error('Cannot delete branch with children');
    }

    this.history.branches = this.history.branches.filter(
      (b) => b.id !== branchId,
    );
  }

  /**
   * Get full history state.
   */
  getState(): BranchingHistory {
    return {
      branches: this.history.branches.map((b) => ({
        ...b,
        operations: [...b.operations],
      })),
      currentBranchId: this.history.currentBranchId,
      operationLog: [...this.history.operationLog],
    };
  }

  /**
   * Load state from storage.
   */
  loadState(state: BranchingHistory): void {
    if (
      !state ||
      !Array.isArray(state.branches) ||
      typeof state.currentBranchId !== 'string' ||
      !Array.isArray(state.operationLog)
    ) {
      return;
    }
    this.history = {
      branches: state.branches.map((b) => ({
        ...b,
        operations: [...b.operations],
      })),
      currentBranchId: state.currentBranchId,
      operationLog: [...state.operationLog],
    };
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createBranchingHistoryStore(
  userId: string,
): BranchingHistoryStore {
  return new BranchingHistoryStore(userId);
}
