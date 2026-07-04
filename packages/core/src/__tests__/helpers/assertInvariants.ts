/**
 * Shared invariant assertion helper.
 *
 * Call after every operation in every test. This is the single source of truth
 * for "state is valid" checks across the entire test suite.
 *
 * Usage:
 *   import { assertInvariants } from './helpers/assertInvariants';
 *   assertInvariants(nextState);  // throws on failure
 */

import { expect } from 'vitest';
import { checkInvariants } from '../../validation/invariants';
import type { TimelineState } from '../../types/state';

/**
 * Assert that a TimelineState has zero invariant violations.
 * Uses Vitest's `expect` under the hood so failures show rich diffs.
 */
export function assertInvariants(state: TimelineState): void {
  const violations = checkInvariants(state);
  expect(violations).toEqual([]);
}

/**
 * Assert invariant violations of specific types exist.
 * Useful when you deliberately construct an invalid state and want to confirm
 * the checker catches it.
 */
export function assertInvariantViolations(
  state: TimelineState,
  expectedTypes: string[],
): void {
  const violations = checkInvariants(state);
  const actualTypes = violations.map(v => v.type);
  for (const t of expectedTypes) {
    expect(actualTypes).toContain(t);
  }
}

/**
 * Convenience: dispatch a transaction, assert accepted, assert invariants,
 * return the next state. Saves ~5 lines per test.
 */
export function applyAndAssert(
  state: TimelineState,
  tx: import('../../types/operations').Transaction,
): TimelineState {
  const { dispatch } = require('../../engine/dispatcher');
  const result = dispatch(state, tx);
  expect(result.accepted).toBe(true);
  if (!result.accepted) throw new Error(`Rejected: ${result.message}`);
  assertInvariants(result.nextState);
  return result.nextState;
}
