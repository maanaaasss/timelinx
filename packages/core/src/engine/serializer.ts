/**
 * Timeline serialization — Phase 5 Step 1
 *
 * Pure functions. No IO. No DOM. No external deps.
 * serializeTimeline / deserializeTimeline round-trip TimelineState.
 */

import type { TimelineState } from '../types/state';
import type { FileAsset, Asset, AssetId } from '../types/asset';
import type { ClipId } from '../types/clip';
import { checkInvariants } from '../validation/invariants';
import { migrate } from './migrator';
import { SerializationError } from './serialization-error';

export { SerializationError } from './serialization-error';

// ---------------------------------------------------------------------------
// Security: prototype pollution prevention
// ---------------------------------------------------------------------------

/**
 * Maximum allowed JSON payload size in bytes (50 MB).
 * Prevents OOM from maliciously large payloads.
 */
const MAX_JSON_SIZE = 50 * 1024 * 1024;

/**
 * Keys that can enable prototype pollution when deserialized.
 * Stripped recursively from all objects during sanitization.
 */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively strip prototype-pollution keys from a parsed JSON object tree.
 * Arrays are traversed but never contain dangerous keys. Plain objects and
 * the top-level Map conversion are sanitized.
 */
function sanitize<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      (value as unknown[])[i] = sanitize((value as unknown[])[i]);
    }
    return value;
  }

  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (DANGEROUS_KEYS.has(key)) {
      delete obj[key];
    } else {
      obj[key] = sanitize(obj[key]);
    }
  }
  return value;
}

// ---------------------------------------------------------------------------
// serializeTimeline
// ---------------------------------------------------------------------------

/**
 * Serialize state to JSON string.
 * Converts assetRegistry Map to plain object for JSON compatibility.
 */
export function serializeTimeline(state: TimelineState): string {
  const plain = {
    schemaVersion: state.schemaVersion,
    timeline: state.timeline,
    assetRegistry: Object.fromEntries(state.assetRegistry),
  };
  return JSON.stringify(plain, null, 2);
}

// ---------------------------------------------------------------------------
// deserializeTimeline
// ---------------------------------------------------------------------------

/**
 * Parse JSON string, migrate to current schema, validate invariants.
 * Throws SerializationError on invalid JSON, missing schemaVersion,
 * unknown version, or invariant violations.
 */
export function deserializeTimeline(raw: string): TimelineState {
  if (raw.length > MAX_JSON_SIZE) {
    throw new SerializationError(
      `JSON payload exceeds maximum allowed size (${MAX_JSON_SIZE} bytes)`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid JSON';
    throw new SerializationError(msg);
  }

  // Strip prototype-pollution keys (__proto__, constructor, prototype)
  // from the entire object tree before migration or validation.
  sanitize(parsed);

  let state: TimelineState;
  try {
    state = migrate(parsed);
  } catch (e) {
    if (e instanceof SerializationError) throw e;
    throw new SerializationError(e instanceof Error ? e.message : 'Migration failed');
  }

  const violations = checkInvariants(state);
  if (violations.length > 0) {
    throw new SerializationError('State failed invariant checks', violations);
  }

  return state;
}

// ---------------------------------------------------------------------------
// Asset path remapper
// ---------------------------------------------------------------------------

export type AssetRemapCallback = (asset: FileAsset) => FileAsset;

/**
 * Walk assetRegistry; for each FileAsset replace with remap(asset).
 * GeneratorAssets unchanged. Returns new state (immutable).
 */
export function remapAssetPaths(state: TimelineState, remap: AssetRemapCallback): TimelineState {
  const next = new Map<AssetId, Asset>();
  for (const [id, asset] of state.assetRegistry) {
    if (asset.kind === 'file') {
      next.set(id, remap(asset));
    } else {
      next.set(id, asset);
    }
  }
  return { ...state, assetRegistry: next };
}

// ---------------------------------------------------------------------------
// Offline asset detection
// ---------------------------------------------------------------------------

export type OfflineAsset = {
  readonly assetId: AssetId;
  readonly path: string;
  readonly clipIds: readonly ClipId[];
};

/**
 * For each FileAsset where isOnline(asset) === false, collect clip IDs
 * that reference it. Host provides isOnline; core does not do filesystem checks.
 */
export function findOfflineAssets(
  state: TimelineState,
  isOnline: (asset: FileAsset) => boolean,
): OfflineAsset[] {
  const result: OfflineAsset[] = [];
  for (const asset of state.assetRegistry.values()) {
    if (asset.kind !== 'file') continue;
    if (isOnline(asset)) continue;
    const clipIds: ClipId[] = [];
    for (const track of state.timeline.tracks) {
      for (const clip of track.clips) {
        if (clip.assetId === asset.id) clipIds.push(clip.id);
      }
    }
    result.push({
      assetId: asset.id,
      path: asset.filePath,
      clipIds,
    });
  }
  return result;
}
