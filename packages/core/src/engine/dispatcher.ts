/**
 * DISPATCHER — Phase 0 compliant
 *
 * The ONLY entry point for mutating TimelineState.
 * Validates first, applies atomically, checks invariants.
 *
 * Algorithm:
 * 1. For each operation: run per-primitive validator → reject immediately on failure
 * 2. Apply all operations sequentially to get proposedState
 * 3. Run checkInvariants(proposedState) → reject on any violation
 * 4. Bump timeline.version by 1 and return accepted
 *
 * RULE: If one primitive fails, zero primitives are applied.
 */

import type { TimelineState } from '../types/state';
import type {
  Transaction,
  DispatchResult,
} from '../types/operations';
import { applyOperation } from './apply';
import { checkInvariants } from '../validation/invariants';
import { validateOperation } from '../validation/validators';

// ---------------------------------------------------------------------------
// dispatch
// ---------------------------------------------------------------------------

export function dispatch(
  state: TimelineState,
  transaction: Transaction,
): DispatchResult {
  // Step 1 + Step 2: Validate each operation against the rolling state, then apply it.
  // Validating against rolling state is necessary for compound transactions like
  //   [ DELETE_CLIP, INSERT_CLIP(left), INSERT_CLIP(right) ]
  // where INSERT_CLIP validation must see the post-DELETE state (original clip gone).
  // If any op fails validation, we return immediately — zero ops have been committed.
  let proposedState = state;
  for (const op of transaction.operations) {
    const rejection = validateOperation(proposedState, op);
    if (rejection) {
      return {
        accepted: false,
        reason: rejection.reason,
        message: rejection.message,
      };
    }
    proposedState = applyOperation(proposedState, op);
  }

  // Step 3: Run InvariantChecker on the full proposed state
  const violations = checkInvariants(proposedState);
  if (violations.length > 0) {
    return {
      accepted: false,
      reason: 'INVARIANT_VIOLATED',
      message: violations.map((v) => v.message).join('; '),
    };
  }

  // Step 4: Commit — bump version
  // We intentionally do NOT deep-clone here: applyOperation already does
  // structural sharing (only cloning modified tracks/clips). Deep-cloning
  // would destroy those shared references, breaking React hook memoization
  // (useSyncExternalStore uses Object.is on selector results — new refs
  // cause unnecessary re-renders).
  //
  // Instead we freeze shared containers so push/splice on returned state
  // throw in strict mode rather than silently mutating the original.

  // Object.freeze() on a Map does NOT prevent .set()/.delete()/.clear() —
  // those operate on internal slots, not object properties. Wrap in a
  // read-only proxy BEFORE freezing the top-level object (freeze makes
  // properties non-writable, preventing later reassignment).
  const frozenRegistry = new Proxy(
    proposedState.assetRegistry as Map<unknown, unknown>,
    {
      get(target, prop, receiver) {
        if (prop === 'set' || prop === 'delete' || prop === 'clear') {
          throw new TypeError(
            `Cannot modify frozen AssetRegistry: ${(prop as string).toUpperCase()} is disabled`,
          );
        }
        const value = Reflect.get(target, prop, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    },
  ) as typeof proposedState.assetRegistry;

  const nextState: TimelineState = {
    ...proposedState,
    assetRegistry: frozenRegistry,
    timeline: {
      ...proposedState.timeline,
      version: state.timeline.version + 1,
    },
  };

  Object.freeze(nextState);
  Object.freeze(nextState.timeline);
  Object.freeze(nextState.timeline.tracks);
  for (const track of nextState.timeline.tracks) {
    Object.freeze(track);
    Object.freeze(track.clips);
    for (const clip of track.clips) {
      Object.freeze(clip);
    }
  }

  return { accepted: true, nextState };
}
