/**
 * OPERATION PRIMITIVES — Phase 0 compliant
 *
 * The ONLY way to express a mutation in the engine.
 * All mutations flow through: OperationPrimitive[] → Transaction → Dispatcher.
 *
 * RULE: Never add a new mutation function.
 *       Add a new type to OperationPrimitive, handle it in the Dispatcher switch,
 *       update the InvariantChecker, and update OPERATIONS.md.
 *
 * RULE: Transactions are all-or-nothing.
 *       If any primitive fails validation, the entire Transaction is rejected.
 */

import type { TimelineFrame, Timecode } from './frame';
import type { AssetId, Asset, AssetStatus } from './asset';
import type { ClipId, Clip } from './clip';
import type { TrackId, Track } from './track';
import type { SequenceSettings } from './timeline';
import type { TimelineState } from './state';
import type { MarkerId, Marker } from './marker';
import type { Generator } from './generator';
import type { Transition, TransitionAlignment } from './transition';
import type { LinkGroup, LinkGroupId } from './link-group';
import type { TrackGroup, TrackGroupId } from './track-group';

// ---------------------------------------------------------------------------
// OperationPrimitive — the complete, versioned discriminated union
// ---------------------------------------------------------------------------

export type OperationPrimitive =
  // — Clip operations —
  | { type: 'MOVE_CLIP'; clipId: ClipId; newTimelineStart: TimelineFrame; targetTrackId?: TrackId }
  | { type: 'RESIZE_CLIP'; clipId: ClipId; edge: 'start' | 'end'; newFrame: TimelineFrame }
  | { type: 'SLICE_CLIP'; clipId: ClipId; atFrame: TimelineFrame }
  | { type: 'DELETE_CLIP'; clipId: ClipId }
  | { type: 'INSERT_CLIP'; clip: Clip; trackId: TrackId }
  | { type: 'SET_MEDIA_BOUNDS'; clipId: ClipId; mediaIn: TimelineFrame; mediaOut: TimelineFrame }
  | { type: 'SET_CLIP_ENABLED'; clipId: ClipId; enabled: boolean }
  | { type: 'SET_CLIP_REVERSED'; clipId: ClipId; reversed: boolean }
  | { type: 'SET_CLIP_SPEED'; clipId: ClipId; speed: number }
  | { type: 'SET_CLIP_COLOR'; clipId: ClipId; color: string | null }
  | { type: 'SET_CLIP_NAME'; clipId: ClipId; name: string | null }
  | { type: 'SET_CLIP_METADATA'; clipId: ClipId; metadata: Record<string, unknown> }
  // — Track operations —
  | { type: 'ADD_TRACK'; track: Track }
  | { type: 'DELETE_TRACK'; trackId: TrackId }
  | { type: 'REORDER_TRACK'; trackId: TrackId; newIndex: number }
  | { type: 'SET_TRACK_HEIGHT'; trackId: TrackId; height: number }
  | { type: 'SET_TRACK_NAME'; trackId: TrackId; name: string }
  | { type: 'SET_TRACK_MUTE'; trackId: TrackId; muted: boolean }
  | { type: 'SET_TRACK_LOCK'; trackId: TrackId; locked: boolean }
  | { type: 'SET_TRACK_SOLO'; trackId: TrackId; solo: boolean }
  // — Asset operations —
  | { type: 'REGISTER_ASSET'; asset: Asset }
  | { type: 'UNREGISTER_ASSET'; assetId: AssetId }
  | { type: 'SET_ASSET_STATUS'; assetId: AssetId; status: AssetStatus }
  // — Timeline operations —
  | { type: 'RENAME_TIMELINE'; name: string }
  | { type: 'SET_TIMELINE_DURATION'; duration: TimelineFrame }
  | { type: 'SET_TIMELINE_START_TC'; startTimecode: Timecode }
  | { type: 'SET_SEQUENCE_SETTINGS'; settings: Partial<SequenceSettings> }
  // — Phase 3: Marker operations —
  | { type: 'ADD_MARKER'; marker: Marker }
  | { type: 'MOVE_MARKER'; markerId: MarkerId; newFrame: TimelineFrame }
  | { type: 'DELETE_MARKER'; markerId: MarkerId }
  // — Phase 3: In/Out —
  | { type: 'SET_IN_POINT'; frame: TimelineFrame | null }
  | { type: 'SET_OUT_POINT'; frame: TimelineFrame | null }
  | { type: 'INSERT_GENERATOR'; generator: Generator; trackId: TrackId; atFrame: TimelineFrame }
  // — Phase 4: Transitions & Groups —
  | { type: 'ADD_TRANSITION'; clipId: ClipId; transition: Transition }
  | { type: 'DELETE_TRANSITION'; clipId: ClipId }
  | { type: 'SET_TRANSITION_DURATION'; clipId: ClipId; durationFrames: number }
  | { type: 'SET_TRANSITION_ALIGNMENT'; clipId: ClipId; alignment: TransitionAlignment }
  | { type: 'LINK_CLIPS'; linkGroup: LinkGroup }
  | { type: 'UNLINK_CLIPS'; linkGroupId: LinkGroupId }
  | { type: 'ADD_TRACK_GROUP'; trackGroup: TrackGroup }
  | { type: 'DELETE_TRACK_GROUP'; trackGroupId: TrackGroupId }
  | { type: 'SET_TRACK_BLEND_MODE'; trackId: TrackId; blendMode: string }
  | { type: 'SET_TRACK_OPACITY'; trackId: TrackId; opacity: number };

// ---------------------------------------------------------------------------
// Transaction
// ---------------------------------------------------------------------------

/**
 * Transaction — an atomic, labeled batch of OperationPrimitives.
 *
 * All primitives in a Transaction are validated before any are applied.
 * If one fails, none are applied. This is the all-or-nothing rule.
 */
export type Transaction = {
  readonly id: string;
  readonly label: string;
  readonly timestamp: number;
  readonly operations: readonly OperationPrimitive[];
};

// ---------------------------------------------------------------------------
// DispatchResult
// ---------------------------------------------------------------------------

export type RejectionReason =
  | 'OVERLAP'
  | 'LOCKED_TRACK'
  | 'ASSET_MISSING'
  | 'TYPE_MISMATCH'
  | 'OUT_OF_BOUNDS'
  | 'MEDIA_BOUNDS_INVALID'
  | 'ASSET_IN_USE'
  | 'TRACK_NOT_EMPTY'
  | 'SPEED_INVALID'
  | 'INVARIANT_VIOLATED'
  | 'NOT_FOUND'
  | 'CLIP_NOT_FOUND'
  | 'INVALID_RANGE'
  | 'TRANSITION_NOT_FOUND'
  | 'LINK_GROUP_NOT_FOUND'
  | 'TRACK_GROUP_NOT_FOUND'
  | 'DUPLICATE_LINK_GROUP_ID'
  | 'DUPLICATE_TRACK_GROUP_ID'
  | 'INVALID_OPACITY'
  | 'TRACK_NOT_FOUND'
  | 'UNKNOWN_OPERATION'
  | 'DUPLICATE_ID';

export type DispatchResult =
  | { accepted: true; nextState: TimelineState }
  | { accepted: false; reason: RejectionReason; message: string };

// ---------------------------------------------------------------------------
// InvariantViolation (co-located for import convenience)
// ---------------------------------------------------------------------------

export type ViolationType =
  | 'OVERLAP'
  | 'MEDIA_BOUNDS_INVALID'
  | 'ASSET_MISSING'
  | 'TRACK_TYPE_MISMATCH'
  | 'CLIP_BEYOND_TIMELINE'
  | 'TRACK_NOT_SORTED'
  | 'DURATION_MISMATCH'
  | 'SPEED_INVALID'
  | 'SCHEMA_VERSION_MISMATCH'
  | 'MARKER_OUT_OF_BOUNDS'
  | 'IN_OUT_INVALID'
  | 'TRACK_GROUP_NOT_FOUND'
  | 'INVALID_OPACITY'
  | 'INVALID_RANGE'
  | 'LINK_GROUP_NOT_FOUND'
  | 'DUPLICATE_ID';

export type InvariantViolation = {
  readonly type: ViolationType;
  readonly entityId: string;
  readonly message: string;
};
