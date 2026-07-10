/**
 * RollTrimTool — Phase 2 Step 4
 *
 * Drag the boundary between two adjacent clips.
 * Left clip's end and right clip's start move together to the same frame.
 * Combined duration of both clips is unchanged.
 * No downstream ripple. No upstream ripple.
 *
 * TRANSACTION: 2× RESIZE_CLIP with identical newFrame. One history entry.
 *
 * CLAMP (precomputed at onPointerDown — only 5 instance vars needed):
 *   minBoundary = max(leftOrig.timelineStart + 1,
 *                     origBoundary - (leftOrig.mediaOut - leftOrig.mediaIn - 1))
 *   maxBoundary = min(rightOrig.timelineEnd - 1,
 *                     origBoundary + (rightOrig.mediaOut - rightOrig.mediaIn - 1))
 *
 * ORIGBOUNDARY AT onPointerUp:
 *   Read from ctx.state (committed, not yet changed) — avoids a 6th instance var.
 *
 * RULES:
 *   - Zero imports from React, DOM, @webpacked-timeline/react, @webpacked-timeline/ui
 *   - onPointerMove never dispatches
 *   - onPointerUp never mutates instance state
 *   - Every instance variable appears in onCancel()
 *   - Capture-before-reset pattern: compute clamp BEFORE _resetDragState()
 */

import type {
  ITool,
  ToolContext,
  TimelinePointerEvent,
  TimelineKeyEvent,
  ProvisionalState,
} from './types';
import {
  toToolId,
  type ToolId,
  type SnapPointType,
} from './types';
import type { ClipId, Clip } from '../types/clip';
import type { Track }        from '../types/track';
import type { TimelineFrame } from '../types/frame';
import type { Transaction }   from '../types/operations';
import type { TimelineState } from '../types/state';
import type { CaptionId, Caption } from '../types/caption';
import { findClipById } from '../systems/queries';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Pixel distance on each side of a cut point that activates roll trim. */
const EDGE_ZONE_PX = 8;

/** Minimum clip duration in frames. */
const MIN_DURATION = 1;

// ---------------------------------------------------------------------------
// findRollTarget — pure module-level helper, not exported
// ---------------------------------------------------------------------------

/**
 * Find the two adjacent clips that form a cut point near `frame`.
 *
 * Returns null if:
 *   - No clip's end edge is within `zonePx` px of `frame`, OR
 *   - No clip's start edge is within `zonePx` px of `frame`, OR
 *   - The same clip was found for both (very short clip), OR
 *   - There is a gap between leftClip.timelineEnd and rightClip.timelineStart
 *     (a gap means it is not a true cut — roll trim requires adjacency)
 */
function findRollTarget(
  frame:  TimelineFrame,
  track:  Track,
  zonePx: number,
  ppf:    number,
): { leftClip: Clip; rightClip: Clip } | null {
  const zoneFrames = zonePx / ppf;

  const leftClip  = track.clips.find(c => Math.abs(c.timelineEnd   - frame) <= zoneFrames);
  const rightClip = track.clips.find(c => Math.abs(c.timelineStart - frame) <= zoneFrames);

  if (!leftClip || !rightClip)              return null;
  if (leftClip.id === rightClip.id)         return null;  // same clip (degenerate)
  if (leftClip.timelineEnd !== rightClip.timelineStart) return null;  // gap — not a cut

  return { leftClip, rightClip };
}

/**
 * Find two adjacent captions that share a boundary near `frame` on the given track.
 * Returns null if no shared boundary is within the hit zone.
 */
function findCaptionRollTarget(
  frame:   TimelineFrame,
  track:   Track,
  zonePx:  number,
  ppf:     number,
): { leftCaption: Caption; rightCaption: Caption } | null {
  const zoneFrames = zonePx / ppf;

  const leftCaption  = track.captions.find(c => Math.abs(c.endFrame   - frame) <= zoneFrames);
  const rightCaption = track.captions.find(c => Math.abs(c.startFrame - frame) <= zoneFrames);

  if (!leftCaption || !rightCaption) return null;
  if (leftCaption.id === rightCaption.id) return null;  // same caption
  if (leftCaption.endFrame !== rightCaption.startFrame) return null;  // gap — not a cut

  return { leftCaption, rightCaption };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findTrack(state: TimelineState, trackId: string) {
  return state.timeline.tracks.find(t => t.id === trackId) ?? null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

let _txSeq = 0;
function txId(): string { return `roll-trim-tx-${++_txSeq}`; }

// ---------------------------------------------------------------------------
// RollTrimTool
// ---------------------------------------------------------------------------

export class RollTrimTool implements ITool {
  readonly id:          ToolId = toToolId('roll-trim');
  readonly shortcutKey: string = 't';   // 'T' for trim — standard in DaVinci Resolve

  // ── Per-drag tracking (clips) ─────────────────────────────────────────────
  private leftClipId:   ClipId        | null = null;
  private rightClipId:  ClipId        | null = null;

  /**
   * Precomputed clamp bounds — computed once at onPointerDown from all 4 constraints.
   * Avoids storing all 8 original clip bounds as separate instance vars.
   */
  private minBoundary:  TimelineFrame | null = null;
  private maxBoundary:  TimelineFrame | null = null;

  // ── Per-drag tracking (captions) ──────────────────────────────────────────
  private leftCaptionId:      CaptionId     | null = null;
  private rightCaptionId:     CaptionId     | null = null;
  private captionTrackId:     string        | null = null;
  /** [min, max] boundary range for caption roll — ensures each caption stays ≥ 1 frame. */
  private captionMinBoundary: TimelineFrame | null = null;
  private captionMaxBoundary: TimelineFrame | null = null;

  // ── getCursor() staging ───────────────────────────────────────────────────
  /** True when the pointer is hovering a valid cut point (within EDGE_ZONE). */
  private isHoveringCut: boolean = false;

  // ── ITool: getCursor ──────────────────────────────────────────────────────

  getCursor(_ctx: ToolContext): string {
    if (this.leftClipId !== null) return 'ew-resize';   // mid-drag
    if (this.isHoveringCut)      return 'ew-resize';   // hovering cut
    return 'default';
  }

  // ── ITool: getSnapCandidateTypes ─────────────────────────────────────────

  getSnapCandidateTypes(): readonly SnapPointType[] {
    return ['ClipStart', 'ClipEnd', 'Playhead', 'Marker'];
  }

  supportsCaptions(): boolean { return true; }

  // ── ITool: onPointerDown ──────────────────────────────────────────────────

  onPointerDown(event: TimelinePointerEvent, ctx: ToolContext): void {
    if (event.trackId === null) return;

    const track = findTrack(ctx.state, event.trackId);
    if (!track) return;

    // ── Caption roll target ─────────────────────────────────────────────────
    const captionTarget = findCaptionRollTarget(
      event.frame, track, EDGE_ZONE_PX, ctx.pixelsPerFrame,
    );
    if (captionTarget) {
      const { leftCaption, rightCaption } = captionTarget;
      const origBoundary = leftCaption.endFrame;  // === rightCaption.startFrame

      // Caption clamp: each must stay ≥ 1 frame
      const captionMin = Math.max(
        leftCaption.startFrame + MIN_DURATION,
      ) as TimelineFrame;
      const captionMax = Math.min(
        rightCaption.endFrame - MIN_DURATION,
      ) as TimelineFrame;

      if (captionMin > captionMax) return;  // no valid range

      this.leftCaptionId      = leftCaption.id;
      this.rightCaptionId     = rightCaption.id;
      this.captionTrackId     = event.trackId;
      this.captionMinBoundary = captionMin;
      this.captionMaxBoundary = captionMax;
      return;  // caption gesture wins over clip gesture
    }

    // ── Clip roll target (original) ───────────────────────────────────────────
    const target = findRollTarget(event.frame, track, EDGE_ZONE_PX, ctx.pixelsPerFrame);
    if (!target) return;

    const { leftClip, rightClip } = target;
    const origBoundary = leftClip.timelineEnd;   // === rightClip.timelineStart

    // Precompute [minBoundary, maxBoundary] from all valid constraints.
    //
    // KEY INSIGHT: The invariant (mediaOut - mediaIn = timelineEnd - timelineStart)
    // means some constraints are redundant with duration-based ones:
    //
    //  Working constraints:
    //  (A) Left min-duration:   origBoundary >= leftClip.timelineStart + 1
    //  (C) Right min-duration:  origBoundary <= rightClip.timelineEnd - 1
    //  (E) Right media leftward: rightClip.mediaIn + delta >= 0
    //       → origBoundary - rightClip.mediaIn (binding when rolling LEFT far enough)
    //  (B') Left media rightward: leftClip.mediaOut + delta <= leftAsset.intrinsicDuration
    //       → origBoundary + (leftAsset.intrinsicDuration - leftClip.mediaOut)
    //       (binding when rolling RIGHT past left clip's media supply)
    //
    //  Redundant (proven identical to A/C by the invariant):
    //  (B) leftClip.mediaOut + delta >= leftClip.mediaIn + 1  ← same as (A)
    //  (D) rightClip.mediaIn + delta <= rightClip.mediaOut - 1 ← same as (C)
    //

    // Look up left clip's asset for intrinsicDuration (needed for B')
    const leftAsset = ctx.state.assetRegistry.get(leftClip.assetId);
    const leftIntrinsicDuration = leftAsset ? leftAsset.intrinsicDuration : (Infinity as TimelineFrame);

    const minBoundary = Math.max(
      leftClip.timelineStart + MIN_DURATION,           // (A) left min-duration
      origBoundary - rightClip.mediaIn,                // (E) right media leftward bound
    ) as TimelineFrame;

    const maxBoundary = Math.min(
      rightClip.timelineEnd - MIN_DURATION,            // (C) right min-duration
      origBoundary + (leftIntrinsicDuration - leftClip.mediaOut), // (B') left media rightward bound
    ) as TimelineFrame;

    // If there's no valid roll range (clips already at media limits), abort
    if (minBoundary > maxBoundary) return;

    this.leftClipId   = leftClip.id;
    this.rightClipId  = rightClip.id;
    this.minBoundary  = minBoundary;
    this.maxBoundary  = maxBoundary;
  }

  // ── ITool: onPointerMove ──────────────────────────────────────────────────

  onPointerMove(event: TimelinePointerEvent, ctx: ToolContext): ProvisionalState | null {
    // Update isHoveringCut for getCursor()
    if (event.trackId !== null) {
      const track = findTrack(ctx.state, event.trackId);
      this.isHoveringCut = track !== null
        && (
          findRollTarget(event.frame, track, EDGE_ZONE_PX, ctx.pixelsPerFrame) !== null ||
          findCaptionRollTarget(event.frame, track, EDGE_ZONE_PX, ctx.pixelsPerFrame) !== null
        );
    } else {
      this.isHoveringCut = false;
    }

    // ── Caption roll ghost ───────────────────────────────────────────────────
    if (this.leftCaptionId !== null && this.rightCaptionId !== null &&
        this.captionMinBoundary !== null && this.captionMaxBoundary !== null &&
        this.captionTrackId !== null) {
      const snapped       = ctx.snap(event.frame, [this.leftCaptionId, this.rightCaptionId]) as TimelineFrame;
      const boundaryFrame = clamp(snapped, this.captionMinBoundary, this.captionMaxBoundary) as TimelineFrame;
      return this._buildCaptionGhost(boundaryFrame, ctx.state);
    }

    // ── Clip roll ghost (original) ──────────────────────────────────────────
    // Not mid-drag
    if (this.leftClipId === null || this.rightClipId === null ||
        this.minBoundary === null || this.maxBoundary === null) {
      return null;
    }

    const snapped       = ctx.snap(event.frame, [this.leftClipId, this.rightClipId]) as TimelineFrame;
    const boundaryFrame = clamp(snapped, this.minBoundary, this.maxBoundary) as TimelineFrame;

    return this._buildGhost(boundaryFrame, ctx.state);
  }

  // ── ITool: onPointerUp ────────────────────────────────────────────────────

  onPointerUp(event: TimelinePointerEvent, ctx: ToolContext): Transaction | null {
    // ── Caption roll-trim path ───────────────────────────────────────────────
    if (this.leftCaptionId !== null && this.captionMinBoundary !== null &&
        this.captionMaxBoundary !== null && this.captionTrackId !== null) {
      const snapped = ctx.snap(event.frame, [
        ...(this.leftCaptionId  ? [this.leftCaptionId]  : []),
        ...(this.rightCaptionId ? [this.rightCaptionId] : []),
      ]) as TimelineFrame;
      const boundaryFrame = clamp(snapped, this.captionMinBoundary, this.captionMaxBoundary) as TimelineFrame;

      const leftId   = this.leftCaptionId;
      const rightId  = this.rightCaptionId;
      const trackId  = this.captionTrackId;
      this._resetCaptionDragState();

      if (!leftId || !rightId || !trackId) return null;

      const track       = ctx.state.timeline.tracks.find(t => t.id === trackId);
      const liveLeft    = track?.captions.find(c => c.id === leftId);
      const liveRight   = track?.captions.find(c => c.id === rightId);
      if (!liveLeft || !liveRight) return null;

      const origBoundary = liveLeft.endFrame;
      if (boundaryFrame === origBoundary) return null;  // no-op

      return {
        id:        txId(),
        label:     'Roll Trim Caption',
        timestamp: Date.now(),
        operations: [
          {
            type:      'EDIT_CAPTION' as const,
            captionId: leftId,
            trackId:   trackId as import('../types/track').TrackId,
            endFrame:  boundaryFrame,
          },
          {
            type:       'EDIT_CAPTION' as const,
            captionId:  rightId,
            trackId:    trackId as import('../types/track').TrackId,
            startFrame: boundaryFrame,
          },
        ],
      };
    }

    // ── Clip roll-trim path (original) ───────────────────────────────────────
    // STEP 1: Compute clamped boundary BEFORE reset (capture-before-reset pattern).
    // _resetDragState() clears minBoundary/maxBoundary — must clamp first.
    if (this.minBoundary === null || this.maxBoundary === null) {
      this._resetDragState();
      return null;
    }
    const snapped       = ctx.snap(event.frame, [
      ...(this.leftClipId  ? [this.leftClipId]  : []),
      ...(this.rightClipId ? [this.rightClipId] : []),
    ]) as TimelineFrame;
    const boundaryFrame = clamp(snapped, this.minBoundary, this.maxBoundary) as TimelineFrame;

    // STEP 2: Capture, then reset
    const leftId  = this.leftClipId;
    const rightId = this.rightClipId;
    this._resetDragState();

    if (!leftId || !rightId) return null;

    // STEP 3: Read origBoundary from ctx.state (committed — not yet changed)
    // Option B: avoids a 6th instance variable; ctx.state is safe here.
    const liveLeft     = findClipById(ctx.state, leftId);
    const origBoundary = liveLeft?.timelineEnd ?? null;
    if (origBoundary === null) return null;

    // No-op: boundary didn't move
    if (boundaryFrame === origBoundary) return null;

    return {
      id:        txId(),
      label:     'Roll Trim',
      timestamp: Date.now(),
      operations: [
        { type: 'RESIZE_CLIP', clipId: leftId,  edge: 'end',   newFrame: boundaryFrame },
        { type: 'RESIZE_CLIP', clipId: rightId, edge: 'start', newFrame: boundaryFrame },
      ],
    };
  }

  // ── ITool: onKeyDown / onKeyUp ────────────────────────────────────────────

  onKeyDown(_event: TimelineKeyEvent, _ctx: ToolContext): Transaction | null {
    return null;
  }

  onKeyUp(_event: TimelineKeyEvent, _ctx: ToolContext): void {}

  // ── ITool: onCancel ───────────────────────────────────────────────────────
  /** Reset ALL instance state. Every variable must appear here. */
  onCancel(): void {
    this.leftClipId    = null;
    this.rightClipId   = null;
    this.minBoundary   = null;
    this.maxBoundary   = null;
    this.isHoveringCut = false;
    // Caption drag state
    this.leftCaptionId      = null;
    this.rightCaptionId     = null;
    this.captionTrackId     = null;
    this.captionMinBoundary = null;
    this.captionMaxBoundary = null;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _buildGhost(boundaryFrame: TimelineFrame, state: TimelineState): ProvisionalState | null {
    if (!this.leftClipId || !this.rightClipId) return null;

    const liveLeft  = findClipById(state, this.leftClipId);
    const liveRight = findClipById(state, this.rightClipId);
    if (!liveLeft || !liveRight) return null;

    const ghostLeft:  Clip = { ...liveLeft,  timelineEnd:   boundaryFrame };
    const ghostRight: Clip = { ...liveRight, timelineStart: boundaryFrame };

    return {
      clips:         [ghostLeft, ghostRight],
      isProvisional: true,
    };
  }

  private _buildCaptionGhost(boundaryFrame: TimelineFrame, state: TimelineState): ProvisionalState | null {
    if (!this.leftCaptionId || !this.rightCaptionId || !this.captionTrackId) return null;

    const track      = state.timeline.tracks.find(t => t.id === this.captionTrackId);
    const liveLeft   = track?.captions.find(c => c.id === this.leftCaptionId);
    const liveRight  = track?.captions.find(c => c.id === this.rightCaptionId);
    if (!liveLeft || !liveRight) return null;

    const ghostLeft:  Caption = { ...liveLeft,  endFrame:   boundaryFrame };
    const ghostRight: Caption = { ...liveRight, startFrame: boundaryFrame };

    return {
      clips:         [],
      captions:      [ghostLeft, ghostRight],
      isProvisional: true,
    };
  }

  private _resetDragState(): void {
    this.leftClipId   = null;
    this.rightClipId  = null;
    this.minBoundary  = null;
    this.maxBoundary  = null;
    // isHoveringCut is NOT reset here — it is a hover-state var, not drag-state
  }

  private _resetCaptionDragState(): void {
    this.leftCaptionId      = null;
    this.rightCaptionId     = null;
    this.captionTrackId     = null;
    this.captionMinBoundary = null;
    this.captionMaxBoundary = null;
  }
}
