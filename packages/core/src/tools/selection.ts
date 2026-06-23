/**
 * SelectionTool — with edge trimming support
 *
 * Handles five interaction modes:
 *   MODE 1: Single click  → select/deselect clip
 *   MODE 2: Single drag   → move one clip
 *   MODE 3: Multi drag    → move all selected clips
 *   MODE 4: Rubber-band   → marquee select
 *   MODE 5: Edge drag     → trim clip start/end
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
import { findClipById }       from '../systems/queries';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DRAG_THRESHOLD_PX = 4;
const EDGE_HIT_ZONE_PX = 8;
const MIN_DURATION_FRAMES = 1;

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type DragMode = 'idle' | 'drag-clip' | 'rubber-band' | 'trim-edge';

type TrimEdge = 'start' | 'end';

type OriginalPosition = {
  readonly timelineStart: TimelineFrame;
  readonly timelineEnd:   TimelineFrame;
  readonly trackId:       TrackId;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function liveClip(state: TimelineState, id: ClipId): Clip | undefined {
  return findClipById(state, id);
}

function hitEdge(
  clip: Clip,
  clientX: number,
  ppf: number,
  originX: number,
): 'start' | 'end' | null {
  const startPx = clip.timelineStart * ppf + originX;
  const endPx   = clip.timelineEnd   * ppf + originX;
  if (Math.abs(clientX - startPx) <= EDGE_HIT_ZONE_PX) return 'start';
  if (Math.abs(clientX - endPx)   <= EDGE_HIT_ZONE_PX) return 'end';
  return null;
}

function collectClips(state: TimelineState, ids: ReadonlySet<ClipId>): Clip[] {
  const result: Clip[] = [];
  for (const id of ids) {
    const c = liveClip(state, id);
    if (c) result.push(c);
  }
  return result;
}

function validSingleClipStart(
  state: TimelineState,
  clip: Clip,
  requestedStart: TimelineFrame,
): TimelineFrame {
  const duration = clip.timelineEnd - clip.timelineStart;
  const maxStart = Math.max(0, state.timeline.duration - duration);
  const requested = Math.max(0, Math.min(requestedStart, maxStart));
  const track = state.timeline.tracks.find((candidate) => candidate.id === clip.trackId);
  if (!track) return requested as TimelineFrame;

  const occupied = track.clips
    .filter((candidate) => candidate.id !== clip.id)
    .sort((a, b) => a.timelineStart - b.timelineStart);
  const candidates = new Set<number>([requested, 0, maxStart]);
  for (const candidate of occupied) {
    candidates.add(Math.max(0, Math.min(candidate.timelineStart - duration, maxStart)));
    candidates.add(Math.max(0, Math.min(candidate.timelineEnd, maxStart)));
  }

  let best = clip.timelineStart as number;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const end = candidate + duration;
    const overlaps = occupied.some(
      (existing) => candidate < existing.timelineEnd && end > existing.timelineStart,
    );
    const distance = Math.abs(candidate - requested);
    if (!overlaps && distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best as TimelineFrame;
}

let _txSeq = 0;
function txId(): string { return `selection-tx-${++_txSeq}`; }

// ---------------------------------------------------------------------------
// SelectionTool
// ---------------------------------------------------------------------------

export class SelectionTool implements ITool {
  readonly id:          ToolId = toToolId('selection');
  readonly shortcutKey: string = 'v';

  // ── Selection state ────────────────────────────────────────────────────
  private readonly selected: Set<ClipId> = new Set();

  // ── Per-gesture tracking ───────────────────────────────────────────────
  private mode:             DragMode      = 'idle';

  // drag-clip mode
  private dragStartFrame:   TimelineFrame | null     = null;
  private dragStartX:       number        | null     = null;
  private dragStartY:       number        | null     = null;
  private dragClipId:       ClipId        | null     = null;
  private isMultiDrag:      boolean                  = false;
  private originalPositions: Map<ClipId, OriginalPosition> = new Map();

  // trim-edge mode
  private trimEdge:         TrimEdge      | null = null;
  private trimOrigStart:    TimelineFrame | null = null;
  private trimOrigEnd:      TimelineFrame | null = null;

  // rubber-band mode
  private rubberBandStartFrame: TimelineFrame | null = null;
  private rubberBandStartY:     number        | null = null;

  // getCursor() state
  private lastClientX:  number        | null = null;
  private lastHitEdge:  'start'|'end' | null = null;
  private _lastHoveredClipId: ClipId | null = null;

  // ── Public read access ──────────────────────────────────────────────────

  getSelection(): ReadonlySet<ClipId> {
    return this.selected;
  }

  clearSelection(): void {
    this.selected.clear();
  }

  // ── ITool: getCursor ────────────────────────────────────────────────────

  getCursor(_ctx: ToolContext): string {
    if (this.mode === 'trim-edge')    return 'ew-resize';
    if (this.mode === 'drag-clip')    return 'grabbing';
    if (this.mode === 'rubber-band')  return 'crosshair';
    if (this.lastHitEdge !== null)    return 'ew-resize';
    if (this._lastHoveredClipId !== null) return 'grab';
    return 'default';
  }

  // ── ITool: getSnapCandidateTypes ────────────────────────────────────────

  getSnapCandidateTypes(): readonly SnapPointType[] {
    return ['ClipStart', 'ClipEnd', 'Playhead'];
  }

  // ── ITool: onPointerDown ────────────────────────────────────────────────

  onPointerDown(event: TimelinePointerEvent, ctx: ToolContext): void {
    this.lastClientX       = event.x;
    this._lastHoveredClipId = event.clipId;

    if (event.clipId !== null) {
      const clip = liveClip(ctx.state, event.clipId);
      if (!clip) return;

      // Check if we're hitting an edge — switch to trim mode
      const edge = hitEdge(clip, event.x, ctx.pixelsPerFrame, 0);
      if (edge !== null) {
        this.mode          = 'trim-edge';
        this.dragStartX    = event.x;
        this.dragStartY    = event.y;
        this.dragStartFrame = event.frame;
        this.dragClipId    = event.clipId;
        this.trimEdge      = edge;
        this.trimOrigStart = clip.timelineStart;
        this.trimOrigEnd   = clip.timelineEnd;
        return;
      }

      // Regular clip drag
      this.mode          = 'drag-clip';
      this.dragStartX    = event.x;
      this.dragStartY    = event.y;
      this.dragStartFrame = event.frame;
      this.dragClipId    = event.clipId;
      this.isMultiDrag = this.selected.size > 1 && this.selected.has(event.clipId);

      this.originalPositions.clear();
      const clipsToRecord = this.isMultiDrag ? [...this.selected] : [event.clipId];
      for (const id of clipsToRecord) {
        const c = liveClip(ctx.state, id);
        if (c) {
          this.originalPositions.set(id, {
            timelineStart: c.timelineStart,
            timelineEnd:   c.timelineEnd,
            trackId:       c.trackId,
          });
        }
      }
    } else {
      this.mode                  = 'rubber-band';
      this.dragStartX            = event.x;
      this.rubberBandStartFrame  = event.frame;
      this.rubberBandStartY      = event.y;
    }
  }

  // ── ITool: onPointerMove ────────────────────────────────────────────────

  onPointerMove(event: TimelinePointerEvent, ctx: ToolContext): ProvisionalState | null {
    this.lastClientX        = event.x;
    this._lastHoveredClipId = event.clipId;

    // Update edge-hover state
    if (event.clipId !== null) {
      const c = liveClip(ctx.state, event.clipId);
      this.lastHitEdge = c ? hitEdge(c, event.x, ctx.pixelsPerFrame, 0) : null;
    } else {
      this.lastHitEdge        = null;
      this._lastHoveredClipId = null;
    }

    // ── MODE 4: rubber-band ─────────────────────────────────────────────
    if (this.mode === 'rubber-band') {
      if (this.rubberBandStartFrame === null || this.rubberBandStartY === null) return null;
      return {
        clips:      [],
        rubberBand: {
          startFrame: this.rubberBandStartFrame,
          endFrame:   event.frame,
          startY:     this.rubberBandStartY,
          endY:       event.y,
        },
        isProvisional: true,
      };
    }

    // ── MODE 5: trim-edge ───────────────────────────────────────────────
    if (this.mode === 'trim-edge' && this.dragClipId !== null && this.trimEdge !== null) {
      const clip = liveClip(ctx.state, this.dragClipId);
      if (!clip) return null;

      const rawFrame = event.frame;
      const snapped = ctx.snap(rawFrame, [this.dragClipId]) as TimelineFrame;

      // Clamp to valid range
      let newFrame: TimelineFrame;
      if (this.trimEdge === 'end') {
        const minEnd = (clip.timelineStart + MIN_DURATION_FRAMES) as TimelineFrame;
        newFrame = Math.max(snapped, minEnd) as TimelineFrame;
      } else {
        const maxStart = (clip.timelineEnd - MIN_DURATION_FRAMES) as TimelineFrame;
        const minStart = 0 as TimelineFrame;
        newFrame = Math.min(Math.max(snapped, minStart), maxStart) as TimelineFrame;
      }

      // Build ghost
      const ghost: Clip = this.trimEdge === 'end'
        ? { ...clip, timelineEnd: newFrame }
        : { ...clip, timelineStart: newFrame };

      return {
        clips: [ghost],
        isProvisional: true,
      };
    }

    // ── MODE 1: click (below drag threshold) ────────────────────────────
    if (this.mode === 'drag-clip' && this.dragStartX !== null) {
      const dxPx = Math.abs(event.x - this.dragStartX);
      if (dxPx < DRAG_THRESHOLD_PX) return null;
    }

    // ── MODE 2: single clip drag ────────────────────────────────────────
    if (this.mode === 'drag-clip' && !this.isMultiDrag && this.dragClipId !== null) {
      const clip = liveClip(ctx.state, this.dragClipId);
      if (!clip || this.dragStartFrame === null) return null;

      const frameDelta    = event.frame - this.dragStartFrame;
      const orig          = this.originalPositions.get(this.dragClipId);
      if (!orig) return null;

      const rawTarget     = (orig.timelineStart + frameDelta) as TimelineFrame;
      const snappedStart  = validSingleClipStart(
        ctx.state,
        clip,
        ctx.snap(rawTarget, [this.dragClipId]),
      );
      const duration      = (clip.timelineEnd - clip.timelineStart) as TimelineFrame;

      return {
        clips: [{
          ...clip,
          timelineStart: snappedStart,
          timelineEnd:   (snappedStart + duration) as TimelineFrame,
        }],
        isProvisional: true,
      };
    }

    // ── MODE 3: multi-clip drag ──────────────────────────────────────────
    if (this.mode === 'drag-clip' && this.isMultiDrag && this.dragClipId !== null) {
      if (this.dragStartFrame === null) return null;

      const frameDelta   = event.frame - this.dragStartFrame;
      const anchorOrig   = this.originalPositions.get(this.dragClipId);
      if (!anchorOrig) return null;

      const rawAnchor    = (anchorOrig.timelineStart + frameDelta) as TimelineFrame;
      const snappedAnchor = ctx.snap(rawAnchor, [...this.selected]);
      const snappedDelta  = (snappedAnchor - anchorOrig.timelineStart) as TimelineFrame;

      const ghosts: Clip[] = [];
      for (const id of this.selected) {
        const c = liveClip(ctx.state, id);
        if (!c) continue;
        const orig = this.originalPositions.get(id);
        if (!orig) continue;
        ghosts.push({
          ...c,
          timelineStart: (orig.timelineStart + snappedDelta) as TimelineFrame,
          timelineEnd:   (orig.timelineEnd   + snappedDelta) as TimelineFrame,
        });
      }

      return { clips: ghosts, isProvisional: true };
    }

    return null;
  }

  // ── ITool: onPointerUp ──────────────────────────────────────────────────

  onPointerUp(event: TimelinePointerEvent, ctx: ToolContext): Transaction | null {
    const previousMode        = this.mode;
    const savedDragClipId     = this.dragClipId;
    const savedDragStartFrame = this.dragStartFrame;
    const savedDragStartX     = this.dragStartX;
    const savedIsMultiDrag    = this.isMultiDrag;
    const savedOrigPositions  = new Map(this.originalPositions);
    const savedRbStartFrame   = this.rubberBandStartFrame;
    const savedSelected       = new Set(this.selected);
    const savedTrimEdge       = this.trimEdge;

    this._resetDragState();

    // ── MODE 4: rubber-band complete ────────────────────────────────────
    if (previousMode === 'rubber-band') {
      const dxPx = savedDragStartX !== null ? Math.abs(event.x - savedDragStartX) : 0;
      if (dxPx < DRAG_THRESHOLD_PX) {
        this.selected.clear();
        return null;
      }

      if (savedRbStartFrame === null) return null;
      const minFrame = Math.min(savedRbStartFrame, event.frame) as TimelineFrame;
      const maxFrame = Math.max(savedRbStartFrame, event.frame) as TimelineFrame;

      for (const track of ctx.state.timeline.tracks) {
        for (const clip of track.clips) {
          if (clip.timelineStart < maxFrame && clip.timelineEnd > minFrame) {
            this.selected.add(clip.id);
          }
        }
      }
      return null;
    }

    // ── MODE 5: trim-edge complete ──────────────────────────────────────
    if (previousMode === 'trim-edge' && savedDragClipId !== null && savedTrimEdge !== null) {
      const clip = liveClip(ctx.state, savedDragClipId);
      if (!clip) return null;

      const rawFrame = event.frame;
      const snapped = ctx.snap(rawFrame, [savedDragClipId]) as TimelineFrame;

      let newFrame: TimelineFrame;
      if (savedTrimEdge === 'end') {
        const minEnd = (clip.timelineStart + MIN_DURATION_FRAMES) as TimelineFrame;
        newFrame = Math.max(snapped, minEnd) as TimelineFrame;
      } else {
        const maxStart = (clip.timelineEnd - MIN_DURATION_FRAMES) as TimelineFrame;
        newFrame = Math.min(Math.max(snapped, 0), maxStart) as TimelineFrame;
      }

      // No-op check
      const originalEdge = savedTrimEdge === 'end' ? clip.timelineEnd : clip.timelineStart;
      if (newFrame === originalEdge) return null;

      return {
        id:         txId(),
        label:      `Trim ${savedTrimEdge}`,
        timestamp:  Date.now(),
        operations: [{
          type:    'RESIZE_CLIP',
          clipId:  savedDragClipId,
          edge:    savedTrimEdge,
          newFrame,
        }],
      };
    }

    if (previousMode !== 'drag-clip') return null;

    // ── MODE 1: click ───────────────────────────────────────────────────
    const dxPx = savedDragStartX !== null ? Math.abs(event.x - savedDragStartX) : 0;
    if (dxPx < DRAG_THRESHOLD_PX) {
      if (event.clipId !== null) {
        if (event.shiftKey) {
          if (this.selected.has(event.clipId)) this.selected.delete(event.clipId);
          else                                  this.selected.add(event.clipId);
        } else {
          this.selected.clear();
          this.selected.add(event.clipId);
        }
      } else {
        this.selected.clear();
      }
      return null;
    }

    if (savedDragClipId === null) return null;

    // ── MODE 2: single clip drag ────────────────────────────────────────
    if (!savedIsMultiDrag) {
      const orig = savedOrigPositions.get(savedDragClipId);
      if (!orig) return null;

      const frameDelta = (event.frame - (savedDragStartFrame ?? event.frame)) as TimelineFrame;
      const rawTarget  = (orig.timelineStart + frameDelta) as TimelineFrame;
      const clip = liveClip(ctx.state, savedDragClipId);
      if (!clip) return null;
      const snapped = validSingleClipStart(
        ctx.state,
        clip,
        ctx.snap(rawTarget, [savedDragClipId]),
      );

      if (snapped === orig.timelineStart) return null;

      return {
        id:         txId(),
        label:      'Move Clip',
        timestamp:  Date.now(),
        operations: [{
          type:             'MOVE_CLIP',
          clipId:           savedDragClipId,
          newTimelineStart: snapped,
        }],
      };
    }

    // ── MODE 3: multi-clip drag ──────────────────────────────────────────
    const anchorOrig = savedOrigPositions.get(savedDragClipId);
    if (!anchorOrig) return null;

    const frameDelta    = (event.frame - (savedDragStartFrame ?? event.frame)) as TimelineFrame;
    const rawAnchor     = (anchorOrig.timelineStart + frameDelta) as TimelineFrame;
    const snappedAnchor = ctx.snap(rawAnchor, [...savedSelected]);
    const snappedDelta  = (snappedAnchor - anchorOrig.timelineStart) as TimelineFrame;

    if (snappedDelta === 0) return null;

    const operations = [...savedSelected].flatMap(id => {
      const orig = savedOrigPositions.get(id);
      if (!orig) return [];
      return [{
        type:             'MOVE_CLIP' as const,
        clipId:           id,
        newTimelineStart: (orig.timelineStart + snappedDelta) as TimelineFrame,
      }];
    });

    if (operations.length === 0) return null;

    return {
      id:        txId(),
      label:     `Move ${operations.length} Clips`,
      timestamp: Date.now(),
      operations,
    };
  }

  // ── ITool: onKeyDown / onKeyUp ──────────────────────────────────────────

  onKeyDown(_event: TimelineKeyEvent, _ctx: ToolContext): Transaction | null {
    return null;
  }

  onKeyUp(_event: TimelineKeyEvent, _ctx: ToolContext): void {}

  // ── ITool: onCancel ─────────────────────────────────────────────────────

  onCancel(): void {
    this.selected.clear();
    this.mode                  = 'idle';
    this.dragStartFrame        = null;
    this.dragStartX            = null;
    this.dragStartY            = null;
    this.dragClipId            = null;
    this.isMultiDrag           = false;
    this.originalPositions.clear();
    this.trimEdge              = null;
    this.trimOrigStart         = null;
    this.trimOrigEnd           = null;
    this.rubberBandStartFrame  = null;
    this.rubberBandStartY      = null;
    this.lastClientX           = null;
    this.lastHitEdge           = null;
    this._lastHoveredClipId    = null;
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private _resetDragState(): void {
    this.mode                  = 'idle';
    this.dragStartFrame        = null;
    this.dragStartX            = null;
    this.dragStartY            = null;
    this.isMultiDrag           = false;
    this.originalPositions.clear();
    this.trimEdge              = null;
    this.trimOrigStart         = null;
    this.trimOrigEnd           = null;
    this.rubberBandStartFrame  = null;
    this.rubberBandStartY      = null;
  }
}
