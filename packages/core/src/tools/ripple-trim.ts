/**
 * RippleTrimTool — Phase 2 Step 3
 *
 * Drag a clip edge (start or end). The dragged edge moves.
 * All clips downstream of the edit point shift by the same delta.
 *
 * Also handles caption trim: dragging a caption edge moves startFrame/endFrame
 * and shifts downstream captions on the same track.
 *
 * DOWNSTREAM DEFINITION:
 *   END edge trim:   clips with timelineStart >= original.timelineEnd  (to the right)
 *   START edge trim: clips with timelineEnd   <= original.timelineStart (to the left)
 *
 * START EDGE SEMANTICS:
 *   When the start edge moves right (+delta), left clips also shift right (+delta).
 *   When the start edge moves left  (-delta), left clips also shift left  (-delta).
 *   This is standard NLE ripple trim behavior (Premiere / Resolve convention).
 *
 * TRANSACTION ORDER:
 *   RESIZE_CLIP first, then N× MOVE_CLIP.
 *   Rolling-state validation means MOVE_CLIPs validate after RESIZE is applied.
 *
 * CLAMPING (applied before ghost and Transaction):
 *   1. Min duration: clip must remain ≥ 1 frame
 *   2. Media bounds: mediaIn must stay < mediaOut - 1 (START); mediaOut > mediaIn + 1 (END)
 *   3. Frame-0: for START trim, leftward shift must not push any left-clip below frame 0
 *
 * RULES:
 *   - Zero imports from React, DOM, @webpacked-timeline/react, @webpacked-timeline/ui
 *   - onPointerMove never dispatches
 *   - onPointerUp never mutates instance state
 *   - Every instance variable appears in onCancel()
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
import type { TrackId }      from '../types/track';
import type { TimelineFrame } from '../types/frame';
import type { Transaction }   from '../types/operations';
import type { TimelineState } from '../types/state';
import type { CaptionId, Caption } from '../types/caption';
import { findClipById } from '../systems/queries';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Pixel width on each side of a clip edge that counts as "grabbing" the edge. */
const EDGE_HIT_ZONE_PX = 8;

/** Minimum allowed clip duration in frames. */
const MIN_DURATION_FRAMES = 1;

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type TrimEdge = 'start' | 'end';

type DownstreamPosition = {
  readonly timelineStart: TimelineFrame;
  readonly timelineEnd:   TimelineFrame;
  readonly trackId:       TrackId;
};

// ---------------------------------------------------------------------------
// computeDownstreamClips — pure module-level helper, not exported
// ---------------------------------------------------------------------------

/**
 * Return the clips that ripple when `clip`'s `edge` is trimmed.
 *
 * END edge:   clips on same track with timelineStart >= clip.timelineEnd (to the right)
 * START edge: clips on same track with timelineEnd   <= clip.timelineStart (to the left)
 *
 * The dragged clip itself is always excluded.
 */
function computeDownstreamClips(
  clip:  Clip,
  edge:  TrimEdge,
  state: TimelineState,
): Clip[] {
  const track = state.timeline.tracks.find(t => t.id === clip.trackId);
  if (!track) return [];

  if (edge === 'end') {
    return track.clips.filter(
      c => c.id !== clip.id && c.timelineStart >= clip.timelineEnd,
    );
  } else {
    return track.clips.filter(
      c => c.id !== clip.id && c.timelineEnd <= clip.timelineStart,
    );
  }
}

/**
 * Return the captions that ripple when `caption`'s `edge` is trimmed.
 *
 * END edge:   captions on same track with startFrame >= caption.endFrame (to the right)
 * START edge: captions on same track with endFrame   <= caption.startFrame (to the left)
 *
 * The dragged caption itself is always excluded.
 */
function computeDownstreamCaptions(
  caption:  Caption,
  edge:     TrimEdge,
  trackId:  TrackId,
  state:    TimelineState,
): Caption[] {
  const track = state.timeline.tracks.find(t => t.id === trackId);
  if (!track) return [];

  if (edge === 'end') {
    return track.captions.filter(
      c => c.id !== caption.id && c.startFrame >= caption.endFrame,
    );
  } else {
    return track.captions.filter(
      c => c.id !== caption.id && c.endFrame <= caption.startFrame,
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find a clip by id across all tracks. */
function findClip(state: TimelineState, clipId: ClipId): Clip | undefined {
  for (const track of state.timeline.tracks) {
    const c = track.clips.find(c => c.id === clipId);
    if (c) return c;
  }
  return undefined;
}

/** Find a caption by id on a specific track. */
function findCaption(
  state:     TimelineState,
  captionId: CaptionId,
  trackId:   TrackId,
): Caption | undefined {
  const track = state.timeline.tracks.find(t => t.id === trackId);
  return track?.captions.find(c => c.id === captionId);
}

/** Clamp a value between min and max (inclusive). */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

let _txSeq = 0;
function txId(): string { return `ripple-trim-tx-${++_txSeq}`; }

// ---------------------------------------------------------------------------
// RippleTrimTool
// ---------------------------------------------------------------------------

export class RippleTrimTool implements ITool {
  readonly id:          ToolId = toToolId('ripple-trim');
  readonly shortcutKey: string = 'r';

  // ── Per-drag tracking (clips) ─────────────────────────────────────────────
  private dragClipId:       ClipId        | null = null;
  private dragEdge:         TrimEdge      | null = null;

  /** Original clip bounds — frame values only, never a stale Clip object. */
  private dragOrigStart:    TimelineFrame | null = null;
  private dragOrigEnd:      TimelineFrame | null = null;
  private dragOrigMediaIn:  TimelineFrame | null = null;  // for START media clamp
  private dragOrigMediaOut: TimelineFrame | null = null;  // for END media clamp

  /**
   * Original positions of downstream clips.
   * Keyed by ClipId. Both timelineStart and timelineEnd stored — ghost needs
   * both to render, MOVE_CLIP only needs start (but duration is end - start).
   */
  private originalDownstream: Map<ClipId, DownstreamPosition> = new Map();

  // ── Per-drag tracking (captions) ──────────────────────────────────────────
  /** CaptionId being trimmed (null when trimming a clip). */
  private dragCaptionId:      CaptionId   | null = null;
  /** TrackId of the caption being trimmed. */
  private dragCaptionTrackId: TrackId     | null = null;
  /** Original startFrame of the caption being trimmed. */
  private dragCaptionOrigStart: TimelineFrame | null = null;
  /** Original endFrame of the caption being trimmed. */
  private dragCaptionOrigEnd:   TimelineFrame | null = null;
  /**
   * Original positions of downstream captions (keyed by CaptionId).
   * Stores { startFrame, endFrame } for ghost rendering and EDIT_CAPTION ops.
   */
  private originalDownstreamCaptions: Map<CaptionId, { startFrame: TimelineFrame; endFrame: TimelineFrame }> = new Map();

  // ── getCursor() state ─────────────────────────────────────────────────────
  private lastHitEdge:       TrimEdge | null = null;
  private lastHoveredClipId: ClipId   | null = null;

  // ── ITool: getCursor ──────────────────────────────────────────────────────

  getCursor(_ctx: ToolContext): string {
    if (this.dragEdge !== null)    return 'ew-resize';  // mid-drag
    if (this.lastHitEdge !== null) return 'ew-resize';  // hovering near edge
    return 'default';
  }

  // ── ITool: getSnapCandidateTypes ─────────────────────────────────────────

  getSnapCandidateTypes(): readonly SnapPointType[] {
    return ['ClipStart', 'ClipEnd', 'Playhead', 'Marker'];
  }

  supportsCaptions(): boolean { return true; }

  // ── ITool: onPointerDown ──────────────────────────────────────────────────

  onPointerDown(event: TimelinePointerEvent, ctx: ToolContext): void {
    // ── Caption trim path ───────────────────────────────────────────────────
    if (event.captionId !== null && event.trackId !== null) {
      const caption = findCaption(ctx.state, event.captionId as CaptionId, event.trackId as TrackId);
      if (!caption) return;

      // Determine which edge was grabbed (same 8px hit zone logic)
      const hitZoneFrames = (EDGE_HIT_ZONE_PX / ctx.pixelsPerFrame) as TimelineFrame;
      const distToStart   = Math.abs(event.frame - caption.startFrame) as TimelineFrame;
      const distToEnd     = Math.abs(event.frame - caption.endFrame)   as TimelineFrame;

      let edge: TrimEdge | null = null;
      if (distToEnd   <= hitZoneFrames) edge = 'end';
      if (distToStart <= hitZoneFrames) edge = 'start';  // start wins if equidistant

      if (edge === null) return;  // not close enough to an edge

      const downstream = computeDownstreamCaptions(
        caption, edge, event.trackId as TrackId, ctx.state,
      );

      this.dragEdge               = edge;
      this.dragCaptionId          = event.captionId as CaptionId;
      this.dragCaptionTrackId     = event.trackId as TrackId;
      this.dragCaptionOrigStart   = caption.startFrame;
      this.dragCaptionOrigEnd     = caption.endFrame;

      this.originalDownstreamCaptions.clear();
      for (const dc of downstream) {
        this.originalDownstreamCaptions.set(dc.id, {
          startFrame: dc.startFrame,
          endFrame:   dc.endFrame,
        });
      }
      return;
    }

    // ── Clip trim path (original logic) ────────────────────────────────────
    if (event.clipId === null) return;

    const clip = findClipById(ctx.state, event.clipId);
    if (!clip) return;

    // Determine which edge was grabbed (8px hit zone, converted to frames)
    const hitZoneFrames = (EDGE_HIT_ZONE_PX / ctx.pixelsPerFrame) as TimelineFrame;
    const distToStart   = Math.abs(event.frame - clip.timelineStart) as TimelineFrame;
    const distToEnd     = Math.abs(event.frame - clip.timelineEnd)   as TimelineFrame;

    let edge: TrimEdge | null = null;
    if (distToEnd   <= hitZoneFrames) edge = 'end';
    if (distToStart <= hitZoneFrames) edge = 'start';  // start wins if equidistant

    if (edge === null) return;  // not close enough to an edge

    // Populate downstream clip positions ONCE at drag-start
    const downstream = computeDownstreamClips(clip, edge, ctx.state);

    this.dragClipId       = event.clipId;
    this.dragEdge         = edge;
    this.dragOrigStart    = clip.timelineStart;
    this.dragOrigEnd      = clip.timelineEnd;
    this.dragOrigMediaIn  = clip.mediaIn;
    this.dragOrigMediaOut = clip.mediaOut;

    this.originalDownstream.clear();
    for (const dc of downstream) {
      this.originalDownstream.set(dc.id, {
        timelineStart: dc.timelineStart,
        timelineEnd:   dc.timelineEnd,
        trackId:       dc.trackId,
      });
    }
  }

  // ── ITool: onPointerMove ──────────────────────────────────────────────────

  onPointerMove(event: TimelinePointerEvent, ctx: ToolContext): ProvisionalState | null {
    // Update getCursor() state
    this.lastHoveredClipId = event.clipId;
    if (event.clipId !== null) {
      const c = findClipById(ctx.state, event.clipId);
      if (c) {
        const hitZoneFrames = (EDGE_HIT_ZONE_PX / ctx.pixelsPerFrame) as TimelineFrame;
        const distToStart   = Math.abs(event.frame - c.timelineStart) as TimelineFrame;
        const distToEnd     = Math.abs(event.frame - c.timelineEnd)   as TimelineFrame;
        if (distToEnd   <= hitZoneFrames) this.lastHitEdge = 'end';
        else if (distToStart <= hitZoneFrames) this.lastHitEdge = 'start';
        else this.lastHitEdge = null;
      } else {
        this.lastHitEdge = null;
      }
    } else {
      this.lastHitEdge       = null;
      this.lastHoveredClipId = null;
    }

    // ── Caption trim ghost ───────────────────────────────────────────────────
    if (this.dragCaptionId !== null && this.dragEdge !== null &&
        this.dragCaptionOrigStart !== null && this.dragCaptionOrigEnd !== null) {
      const rawFrame  = event.frame;
      const snapped   = ctx.snap(rawFrame, [this.dragCaptionId]) as TimelineFrame;
      const newFrame  = this._clampCaptionFrame(snapped);
      if (newFrame === null) return null;

      return this._buildCaptionGhost(newFrame, ctx.state);
    }

    // ── Clip trim ghost (original logic) ────────────────────────────────────
    if (this.dragClipId === null || this.dragEdge === null) return null;
    if (this.dragOrigStart === null || this.dragOrigEnd === null) return null;
    if (this.dragOrigMediaIn === null || this.dragOrigMediaOut === null) return null;

    // Snap, excluding the dragged clip's own edges
    const rawFrame    = event.frame;
    const snapped     = ctx.snap(rawFrame, [this.dragClipId]) as TimelineFrame;
    const newFrame    = this._clampFrame(snapped);
    if (newFrame === null) return null;

    return this._buildGhost(newFrame, ctx.state);
  }

  // ── ITool: onPointerUp ────────────────────────────────────────────────────

  onPointerUp(event: TimelinePointerEvent, ctx: ToolContext): Transaction | null {
    // ── Caption trim path ───────────────────────────────────────────────────
    if (this.dragCaptionId !== null) {
      const rawFrame   = event.frame;
      const snapped    = ctx.snap(rawFrame, [this.dragCaptionId]) as TimelineFrame;
      const newFrame   = this._clampCaptionFrame(snapped);

      const captionId          = this.dragCaptionId;
      const trackId            = this.dragCaptionTrackId;
      const origStart          = this.dragCaptionOrigStart;
      const origEnd            = this.dragCaptionOrigEnd;
      const edge               = this.dragEdge;
      const downstreamCaptions = new Map(this.originalDownstreamCaptions);

      this._resetCaptionDragState();

      if (!captionId || !trackId || origStart === null || origEnd === null || !edge) return null;
      if (newFrame === null) return null;

      const originalEdge = edge === 'end' ? origEnd : origStart;
      if (newFrame === originalEdge) return null;  // no-op

      const delta = (newFrame - originalEdge) as TimelineFrame;

      // Sort downstream the same way as clip ripple:
      // +delta → rightmost first; -delta → leftmost first
      const sortedDownstream = [...downstreamCaptions.entries()].sort(([, a], [, b]) =>
        delta >= 0
          ? b.startFrame - a.startFrame   // right-to-left (descending)
          : a.startFrame - b.startFrame,  // left-to-right (ascending)
      );

      return {
        id:        txId(),
        label:     `Ripple Trim Caption (${edge})`,
        timestamp: Date.now(),
        operations: [
          // EDIT_CAPTION for trimmed caption
          edge === 'end'
            ? { type: 'EDIT_CAPTION' as const, captionId, trackId, endFrame:   newFrame }
            : { type: 'EDIT_CAPTION' as const, captionId, trackId, startFrame: newFrame },
          // EDIT_CAPTION for each downstream caption
          ...sortedDownstream.map(([dcId, orig]) => ({
            type:       'EDIT_CAPTION' as const,
            captionId:  dcId,
            trackId,
            startFrame: (orig.startFrame + delta) as TimelineFrame,
            endFrame:   (orig.endFrame   + delta) as TimelineFrame,
          })),
        ],
      };
    }

    // ── Clip trim path (original logic) ─────────────────────────────────────
    // Compute snapped + clamped frame BEFORE resetting instance state.
    // _clampFrame() reads dragEdge, dragOrigStart/End, dragOrigMediaIn/Out,
    // and originalDownstream — all of which _resetDragState() clears.
    const rawFrame    = event.frame;
    const snapped     = ctx.snap(rawFrame, this.dragClipId ? [this.dragClipId] : []) as TimelineFrame;
    const newFrame    = this._clampFrame(snapped);

    // Capture what we need, then reset
    const clipId     = this.dragClipId;
    const edge       = this.dragEdge;
    const origStart  = this.dragOrigStart;
    const origEnd    = this.dragOrigEnd;
    const downstream = new Map(this.originalDownstream);

    this._resetDragState();

    if (clipId === null || edge === null || origStart === null || origEnd === null) return null;
    if (newFrame === null) return null;

    // No-op: edge didn't move
    const originalEdge = edge === 'end' ? origEnd : origStart;
    if (newFrame === originalEdge) return null;

    const delta = (newFrame - originalEdge) as TimelineFrame;

    // Sort downstream entries so MOVE_CLIPs are applied in safe order.
    // When delta > 0 (clips shift right): move the RIGHTMOST clip first so each
    // clip's destination is already clear in the rolling state when validated.
    // When delta < 0 (clips shift left): move the LEFTMOST clip first.
    const sortedDownstream = [...downstream.entries()].sort(([, a], [, b]) =>
      delta >= 0
        ? b.timelineStart - a.timelineStart   // right-to-left (descending)
        : a.timelineStart - b.timelineStart,  // left-to-right (ascending)
    );

    const operations: Transaction['operations'][number][] = [
      // RESIZE first — rolling-state means MOVE_CLIPs validate after RESIZE is applied
      { type: 'RESIZE_CLIP', clipId, edge, newFrame },
      // MOVE_CLIPs in safe order (no inter-clip transient overlap)
      ...sortedDownstream.map(([dcId, orig]) => ({
        type:             'MOVE_CLIP' as const,
        clipId:           dcId,
        newTimelineStart: (orig.timelineStart + delta) as TimelineFrame,
      })),
    ];

    return {
      id:         txId(),
      label:      `Ripple Trim (${edge})`,
      timestamp:  Date.now(),
      operations,
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
    this.dragClipId         = null;
    this.dragEdge           = null;
    this.dragOrigStart      = null;
    this.dragOrigEnd        = null;
    this.dragOrigMediaIn    = null;
    this.dragOrigMediaOut   = null;
    this.originalDownstream.clear();
    this.lastHitEdge        = null;
    this.lastHoveredClipId  = null;
    // Caption drag state
    this.dragCaptionId                  = null;
    this.dragCaptionTrackId             = null;
    this.dragCaptionOrigStart           = null;
    this.dragCaptionOrigEnd             = null;
    this.originalDownstreamCaptions.clear();
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Apply all clamping rules to the candidate newFrame.
   * Returns null if the resulting trim would produce a zero-or-negative-duration clip.
   */
  private _clampFrame(candidate: TimelineFrame): TimelineFrame | null {
    if (this.dragEdge === null || this.dragOrigStart === null || this.dragOrigEnd === null ||
        this.dragOrigMediaIn === null || this.dragOrigMediaOut === null) return null;

    let frame = candidate as number;

    if (this.dragEdge === 'end') {
      // ── END edge clamping ────────────────────────────────────────────────
      // Min duration: newFrame must be > timelineStart + MIN_DURATION_FRAMES - 1
      const minEnd = this.dragOrigStart + MIN_DURATION_FRAMES;
      // Media bounds: mediaOut = dragOrigMediaOut + (frame - dragOrigEnd)
      //   → must stay >= dragOrigMediaIn + 1
      //   → frame >= dragOrigEnd - (dragOrigMediaOut - dragOrigMediaIn - 1)
      const minEndForMedia = this.dragOrigEnd - (this.dragOrigMediaOut - this.dragOrigMediaIn - 1);
      frame = Math.max(frame, minEnd, minEndForMedia);

    } else {
      // ── START edge clamping ──────────────────────────────────────────────
      // Min duration: newFrame must be < timelineEnd - MIN_DURATION_FRAMES + 1
      const maxStart = this.dragOrigEnd - MIN_DURATION_FRAMES;
      // Media bounds (rightward / making clip shorter at front):
      //   mediaIn = dragOrigMediaIn + (frame - dragOrigStart)
      //   → must stay <= dragOrigMediaOut - 1
      //   → frame <= dragOrigStart + (dragOrigMediaOut - dragOrigMediaIn - 1)
      const maxStartForMedia = this.dragOrigStart + (this.dragOrigMediaOut - this.dragOrigMediaIn - 1);
      frame = Math.min(frame, maxStart, maxStartForMedia);

      // Media bounds (leftward / making clip longer at front):
      //   mediaIn = dragOrigMediaIn + (frame - dragOrigStart)
      //   → must stay >= 0
      //   → frame >= dragOrigStart - dragOrigMediaIn
      const minStartForMedia = this.dragOrigStart - this.dragOrigMediaIn;
      frame = Math.max(frame, minStartForMedia);

      // Frame-0 clamp: leftward trim (delta < 0) must not push any left-clip below 0
      const delta = frame - this.dragOrigStart;
      if (delta < 0 && this.originalDownstream.size > 0) {
        // Find leftmost start among downstream (left-side) clips
        let minDownstreamStart = Infinity;
        for (const pos of this.originalDownstream.values()) {
          if (pos.timelineStart < minDownstreamStart) {
            minDownstreamStart = pos.timelineStart;
          }
        }
        if (minDownstreamStart !== Infinity) {
          // leftmost.timelineStart + delta >= 0  →  delta >= -minDownstreamStart
          // →  frame >= dragOrigStart - minDownstreamStart
          const minFrameForLeftClips = this.dragOrigStart - minDownstreamStart;
          frame = Math.max(frame, minFrameForLeftClips);
        }
      }
    }

    // After all clamping: verify clip would still have positive duration
    if (this.dragEdge === 'end'   && frame <= this.dragOrigStart) return null;
    if (this.dragEdge === 'start' && frame >= this.dragOrigEnd)   return null;

    return frame as TimelineFrame;
  }

  /**
   * Clamp a caption trim frame — simpler than clip clamping (no media bounds).
   * Returns null if the resulting trim would produce a zero-or-negative-duration caption.
   */
  private _clampCaptionFrame(candidate: TimelineFrame): TimelineFrame | null {
    if (this.dragEdge === null ||
        this.dragCaptionOrigStart === null ||
        this.dragCaptionOrigEnd   === null) return null;

    let frame = candidate as number;

    if (this.dragEdge === 'end') {
      // Must stay > startFrame (at least 1 frame)
      const minEnd = this.dragCaptionOrigStart + MIN_DURATION_FRAMES;
      frame = Math.max(frame, minEnd);
    } else {
      // Must stay < endFrame (at least 1 frame)
      const maxStart = this.dragCaptionOrigEnd - MIN_DURATION_FRAMES;
      frame = Math.min(frame, maxStart);

      // Frame-0 clamp for start trim: leftward shift must not push left-captions below 0
      const delta = frame - this.dragCaptionOrigStart;
      if (delta < 0 && this.originalDownstreamCaptions.size > 0) {
        let minDownstreamStart = Infinity;
        for (const pos of this.originalDownstreamCaptions.values()) {
          if (pos.startFrame < minDownstreamStart) {
            minDownstreamStart = pos.startFrame;
          }
        }
        if (minDownstreamStart !== Infinity) {
          const minFrameForLeftCaptions = this.dragCaptionOrigStart - minDownstreamStart;
          frame = Math.max(frame, minFrameForLeftCaptions);
        }
      }
    }

    // Verify positive duration
    if (this.dragEdge === 'end'   && frame <= this.dragCaptionOrigStart) return null;
    if (this.dragEdge === 'start' && frame >= this.dragCaptionOrigEnd)   return null;

    return frame as TimelineFrame;
  }

  /**
   * Build the ProvisionalState showing trimmed clip + all shifted downstream clips.
   * Always reads live clip data from ctx.state — never spreads stored clip objects.
   */
  private _buildGhost(newFrame: TimelineFrame, state: TimelineState): ProvisionalState | null {
    if (this.dragClipId === null || this.dragEdge === null || this.dragOrigEnd === null ||
        this.dragOrigStart === null) return null;

    const liveClip = findClipById(state, this.dragClipId);
    if (!liveClip) return null;

    // Delta from the original edge position
    const originalEdge = this.dragEdge === 'end' ? this.dragOrigEnd : this.dragOrigStart;
    const delta = (newFrame - originalEdge) as TimelineFrame;

    // Trimmed clip ghost
    const trimmedGhost: Clip =
      this.dragEdge === 'end'
        ? { ...liveClip, timelineEnd:   newFrame }
        : { ...liveClip, timelineStart: newFrame };

    // Downstream ghosts — all shifted by uniform delta
    const downstreamGhosts: Clip[] = [];
    for (const [dcId, orig] of this.originalDownstream) {
      const liveDc = findClipById(state, dcId);
      if (!liveDc) continue;
      downstreamGhosts.push({
        ...liveDc,
        timelineStart: (orig.timelineStart + delta) as TimelineFrame,
        timelineEnd:   (orig.timelineEnd   + delta) as TimelineFrame,
      });
    }

    return {
      clips:         [trimmedGhost, ...downstreamGhosts],
      isProvisional: true,
    };
  }

  /**
   * Build ProvisionalState for a caption trim gesture.
   * Returns ghost captions: trimmed caption + all shifted downstream captions.
   */
  private _buildCaptionGhost(newFrame: TimelineFrame, state: TimelineState): ProvisionalState | null {
    if (this.dragCaptionId === null || this.dragEdge === null ||
        this.dragCaptionOrigStart === null || this.dragCaptionOrigEnd === null ||
        this.dragCaptionTrackId === null) return null;

    const liveCaption = findCaption(state, this.dragCaptionId, this.dragCaptionTrackId);
    if (!liveCaption) return null;

    const originalEdge = this.dragEdge === 'end' ? this.dragCaptionOrigEnd : this.dragCaptionOrigStart;
    const delta = (newFrame - originalEdge) as TimelineFrame;

    const trimmedGhost: Caption =
      this.dragEdge === 'end'
        ? { ...liveCaption, endFrame:   newFrame }
        : { ...liveCaption, startFrame: newFrame };

    const downstreamGhosts: Caption[] = [];
    for (const [dcId, orig] of this.originalDownstreamCaptions) {
      const liveDc = findCaption(state, dcId, this.dragCaptionTrackId);
      if (!liveDc) continue;
      downstreamGhosts.push({
        ...liveDc,
        startFrame: (orig.startFrame + delta) as TimelineFrame,
        endFrame:   (orig.endFrame   + delta) as TimelineFrame,
      });
    }

    return {
      clips:         [],          // no clip ghosts during caption trim
      captions:      [trimmedGhost, ...downstreamGhosts],
      isProvisional: true,
    };
  }

  /** Reset per-drag clip instance state. Does NOT touch getCursor vars. */
  private _resetDragState(): void {
    this.dragClipId         = null;
    this.dragEdge           = null;
    this.dragOrigStart      = null;
    this.dragOrigEnd        = null;
    this.dragOrigMediaIn    = null;
    this.dragOrigMediaOut   = null;
    this.originalDownstream.clear();
  }

  /** Reset per-drag caption instance state. Also clears dragEdge since captions own it. */
  private _resetCaptionDragState(): void {
    this.dragEdge                      = null;
    this.dragCaptionId                 = null;
    this.dragCaptionTrackId            = null;
    this.dragCaptionOrigStart          = null;
    this.dragCaptionOrigEnd            = null;
    this.originalDownstreamCaptions.clear();
  }
}
