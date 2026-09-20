/**
 * @timelinx/core — Serialization & Storage
 *
 * Sub-path export for timeline serialization, deserialization, and asset path remapping.
 *
 * @example
 * ```ts
 * import { serializeTimeline, deserializeTimeline } from '@timelinx/core/serialization';
 * ```
 */

// ── JSON Serialization ─────────────────────────────────────────────────────
export {
  SerializationError,
  serializeTimeline,
  deserializeTimeline,
  remapAssetPaths,
  findOfflineAssets,
} from './engine/serializer';
export type { AssetRemapCallback, OfflineAsset } from './engine/serializer';
