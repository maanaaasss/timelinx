/**
 * @webpacked-timeline/core — Serialization & Export
 *
 * Sub-path export for timeline serialization and interchange formats.
 *
 * @example
 * ```ts
 * import { serializeTimeline, deserializeTimeline } from '@webpacked-timeline/core/serialization';
 * import { exportToOTIO } from '@webpacked-timeline/core/serialization';
 * import { exportToEDL } from '@webpacked-timeline/core/serialization';
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

// ── OTIO Interchange ───────────────────────────────────────────────────────
export { exportToOTIO } from './engine/otio-export';
export { importFromOTIO } from './engine/otio-import';
export type { OTIODocument } from './engine/otio-export';
export type { OTIOImportOptions } from './engine/otio-import';

// ── EDL Export (CMX 3600) ──────────────────────────────────────────────────
export { exportToEDL, frameToTimecode, reelName } from './engine/edl-export';
export type { EDLExportOptions } from './engine/edl-export';

// ── AAF Export ──────────────────────────────────────────────────────────────
export { exportToAAF } from './engine/aaf-export';
export type { AAFExportOptions } from './engine/aaf-export';

// ── FCP XML Export ──────────────────────────────────────────────────────────
export { exportToFCPXML, toFCPTime } from './engine/fcpxml-export';
export type { FCPXMLExportOptions } from './engine/fcpxml-export';
