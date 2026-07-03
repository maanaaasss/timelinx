/**
 * SuggestionManager - manages AI suggestions workflow.
 *
 * Handles adding, approving, rejecting, and applying suggestions.
 */

import type { Transaction } from '@timelinx/core';
import type {
  SuggestedTransaction,
  SuggestionWithState,
  SuggestionState,
  ISuggestionManager,
} from '../types/suggested-transaction';

// ---------------------------------------------------------------------------
// SuggestionManager
// ---------------------------------------------------------------------------

export class SuggestionManager implements ISuggestionManager {
  private suggestions: Map<string, SuggestionWithState> = new Map();

  /**
   * Add a new suggestion.
   */
  addSuggestion(suggestion: SuggestedTransaction): void {
    if (this.suggestions.has(suggestion.id)) {
      throw new Error(`Suggestion already exists: ${suggestion.id}`);
    }
    const withState: SuggestionWithState = {
      suggestion,
      state: 'pending',
      updatedAt: Date.now(),
    };
    this.suggestions.set(suggestion.id, withState);
  }

  /**
   * Get all pending suggestions.
   */
  getPendingSuggestions(): SuggestionWithState[] {
    return Array.from(this.suggestions.values()).filter(
      (s) => s.state === 'pending',
    );
  }

  /**
   * Get all suggestions.
   */
  getAllSuggestions(): SuggestionWithState[] {
    return Array.from(this.suggestions.values());
  }

  /**
   * Get a suggestion by ID.
   */
  getSuggestion(id: string): SuggestionWithState | undefined {
    return this.suggestions.get(id);
  }

  /**
   * Approve a suggestion.
   */
  approveSuggestion(id: string): void {
    const existing = this.suggestions.get(id);
    if (!existing) {
      throw new Error(`Suggestion not found: ${id}`);
    }
    if (existing.state !== 'pending') {
      throw new Error(`Suggestion is not pending: ${id} (state: ${existing.state})`);
    }
    const updated: SuggestionWithState = {
      ...existing,
      state: 'approved',
      updatedAt: Date.now(),
    };
    this.suggestions.set(id, updated);
  }

  /**
   * Reject a suggestion.
   */
  rejectSuggestion(id: string, reason?: string): void {
    const existing = this.suggestions.get(id);
    if (!existing) {
      throw new Error(`Suggestion not found: ${id}`);
    }
    if (existing.state !== 'pending') {
      throw new Error(`Suggestion is not pending: ${id} (state: ${existing.state})`);
    }
    const updated: SuggestionWithState = {
      ...existing,
      state: 'rejected',
      updatedAt: Date.now(),
      notes: reason,
    };
    this.suggestions.set(id, updated);
  }

  /**
   * Apply an approved suggestion. Returns the transaction.
   */
  applySuggestion(id: string): Transaction | null {
    const existing = this.suggestions.get(id);
    if (!existing || existing.state !== 'approved') {
      return null;
    }
    const updated: SuggestionWithState = {
      ...existing,
      state: 'applied',
      updatedAt: Date.now(),
    };
    this.suggestions.set(id, updated);
    return existing.suggestion.transaction;
  }

  /**
   * Clear all suggestions.
   */
  clear(): void {
    this.suggestions.clear();
  }

  /**
   * Get suggestion count by state.
   */
  getCountByState(): Record<SuggestionState, number> {
    const counts: Record<SuggestionState, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
      applied: 0,
    };
    for (const suggestion of this.suggestions.values()) {
      counts[suggestion.state]++;
    }
    return counts;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a new SuggestionManager.
 */
export function createSuggestionManager(): SuggestionManager {
  return new SuggestionManager();
}
