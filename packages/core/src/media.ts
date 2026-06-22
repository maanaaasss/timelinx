/**
 * @webpacked-timeline/core — Media Utilities
 *
 * Sub-path export for subtitle import, marker search, and thumbnail/worker contracts.
 *
 * @example
 * ```ts
 * import { parseSRT, parseVTT } from '@webpacked-timeline/core/media';
 * import { findMarkersByColor } from '@webpacked-timeline/core/media';
 * ```
 */

// ── Subtitle Import ────────────────────────────────────────────────────────
export {
  parseSRT,
  parseVTT,
  defaultCaptionStyle,
  subtitleImportToOps,
} from './engine/subtitle-import';
export type { SRTParseOptions, VTTParseOptions } from './engine/subtitle-import';

// ── Marker Search ──────────────────────────────────────────────────────────
export { findMarkersByColor, findMarkersByLabel } from './engine/marker-search';

// ── Thumbnail Cache & Queue ────────────────────────────────────────────────
export { ThumbnailCache } from './engine/thumbnail-cache';
export { ThumbnailQueue } from './engine/thumbnail-queue';

// ── Worker Contracts ───────────────────────────────────────────────────────
export type {
  WaveformRequest,
  WaveformPeak,
  WaveformResult,
  WaveformWorkerMessage,
  WaveformWorkerResponse,
  ThumbnailPriority,
  ThumbnailQueueEntry,
  ThumbnailWorkerMessage,
  ThumbnailWorkerResponse,
} from './types/worker-contracts';
