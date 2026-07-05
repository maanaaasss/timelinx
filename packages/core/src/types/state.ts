/**
 * AssetRegistry — the immutable map of assets.
 *
 * IMMUTABILITY CONTRACT:
 * - The type is `ReadonlyMap<AssetId, Asset>` — TypeScript enforces immutability at compile time.
 * - At runtime, the dispatcher freezes the map via `Object.freeze()` to prevent accidental mutation.
 * - IMPORTANT: `Object.freeze()` on a Map does NOT prevent `.set()`, `.delete()`, or `.clear()`
 *   at runtime — those operate on Map internal slots, not object properties. The `ReadonlyMap`
 *   type prevents this at compile time only. Consumers using `as any`/`as unknown` casts or
 *   plain JS can still call `.set()`/`.delete()`/`.clear()` at runtime.
 * - If you need runtime-enforced immutability, wrap the map in a custom immutable structure.
 */
import type { AssetId, Asset } from './asset';
import type { Timeline } from './timeline';

export type AssetRegistry = ReadonlyMap<AssetId, Asset>;

// ---------------------------------------------------------------------------
// Schema versioning
// ---------------------------------------------------------------------------

/**
 * Increment this whenever TimelineState gains a new required field or
 * a field's semantics change in a breaking way.
 *
 * The schemaVersion invariant check rejects loading a future schema
 * into an older engine (prevents silent data corruption on downgrade).
 */
export const CURRENT_SCHEMA_VERSION = 2 as const;

// ---------------------------------------------------------------------------
// TimelineState
// ---------------------------------------------------------------------------

export type TimelineState = {
  readonly schemaVersion: number;        // must equal CURRENT_SCHEMA_VERSION
  readonly timeline:      Timeline;
  readonly assetRegistry: AssetRegistry;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createTimelineState(params: {
  timeline:       Timeline;
  assetRegistry?: AssetRegistry;
}): TimelineState {
  const registry: AssetRegistry =
    params.assetRegistry ?? new Map<AssetId, Asset>();

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timeline:      params.timeline,
    assetRegistry: registry,
  };
}
