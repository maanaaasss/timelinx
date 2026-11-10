/**
 * Transaction guard branches
 *
 * Targets the three `if (tx.finalized)` throws that were previously
 * unreachable in the test suite (lines 87, 112, 130 of transactions.ts).
 */

import { describe, it, expect } from 'vitest';
import {
  beginTransaction,
  applyOperation,
  commitTransaction,
  rollbackTransaction,
  getOperationCount,
} from '../engine/transactions';
import { buildState } from './helpers/buildState';

describe('transactions — beginTransaction', () => {
  it('returns a fresh context with no operations and finalized=false', () => {
    const state = buildState();
    const tx = beginTransaction(state);
    expect(tx.initialState).toBe(state);
    expect(tx.currentState).toBe(state);
    expect(tx.operations).toHaveLength(0);
    expect(tx.finalized).toBe(false);
  });
});

describe('transactions — applyOperation', () => {
  it('accumulates operations and threads state forward', () => {
    const state = buildState();
    const tx0 = beginTransaction(state);
    const tx1 = applyOperation(tx0, (s) => s); // identity op
    expect(getOperationCount(tx1)).toBe(1);
    expect(tx1.finalized).toBe(false);
  });

  it('throws when called on a finalized transaction (line 87)', () => {
    const state = buildState();
    // Manually create a finalized context — the public API has no finalize()
    // method intentionally, so we construct it directly.
    const finalized = { ...beginTransaction(state), finalized: true };
    expect(() => applyOperation(finalized, (s) => s)).toThrow(
      'Cannot apply operation to finalized transaction',
    );
  });
});

describe('transactions — commitTransaction', () => {
  it('returns currentState on a fresh transaction', () => {
    const state = buildState();
    const tx = beginTransaction(state);
    const committed = commitTransaction(tx);
    expect(committed).toBe(state);
  });

  it('returns the latest currentState after operations', () => {
    const state = buildState();
    const tx0 = beginTransaction(state);
    const sentinel = { ...state }; // different reference
    const tx1 = applyOperation(tx0, () => sentinel);
    const committed = commitTransaction(tx1);
    expect(committed).toBe(sentinel);
  });

  it('throws when called on a finalized transaction (line 112)', () => {
    const state = buildState();
    const finalized = { ...beginTransaction(state), finalized: true };
    expect(() => commitTransaction(finalized)).toThrow('Transaction already finalized');
  });
});

describe('transactions — rollbackTransaction', () => {
  it('returns the initial state, discarding applied ops', () => {
    const state = buildState();
    const tx0 = beginTransaction(state);
    const sentinel = { ...state };
    const tx1 = applyOperation(tx0, () => sentinel);
    const rolledBack = rollbackTransaction(tx1);
    expect(rolledBack).toBe(state);
    expect(rolledBack).not.toBe(sentinel);
  });

  it('throws when called on a finalized transaction (line 130)', () => {
    const state = buildState();
    const finalized = { ...beginTransaction(state), finalized: true };
    expect(() => rollbackTransaction(finalized)).toThrow('Transaction already finalized');
  });
});

describe('transactions — getOperationCount', () => {
  it('returns 0 on a fresh transaction', () => {
    expect(getOperationCount(beginTransaction(buildState()))).toBe(0);
  });

  it('returns N after N operations', () => {
    const state = buildState();
    let tx = beginTransaction(state);
    tx = applyOperation(tx, (s) => s);
    tx = applyOperation(tx, (s) => s);
    tx = applyOperation(tx, (s) => s);
    expect(getOperationCount(tx)).toBe(3);
  });
});
