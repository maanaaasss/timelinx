/**
 * SelectionTool
 *
 * Handles four interaction modes:
 *   MODE 1: Single click  → select/deselect clip
 *   MODE 2: Single drag   → move one clip
 *   MODE 3: Multi drag    → move all selected clips
 *   MODE 4: Rubber-band   → marquee select
 *
 * Edge trimming is handled via near-edge clicks in onPointerUp
 * (pendingTrimEdge path), not as a separate drag mode.
 *
 * Edge trim behavior:
 *   - Default: ripple trim (resize clip + shift downstream clips)
 *   - Alt/Option held: roll trim (resize both clips at cut point, no ripple)
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
import type { CaptionId, Caption } from '../types/caption';
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

type DragMode = 'idle' | 'drag-clip' | 'drag-caption' | 'rubber-band';

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

function validCaptionStart(
  state: TimelineState,
  otherCaptions: readonly Caption[],
  requestedStart: TimelineFrame,
  duration: TimelineFrame,
): TimelineFrame {
  const maxStart = Math.max(0, (state.timeline.duration - duration)) as TimelineFrame;
  const requested = Math.max(0, Math.min(requestedStart, maxStart)) as TimelineFrame;

  // Check for overlaps with other captions
  const sorted = [...otherCaptions].sort((a, b) => a.startFrame - b.startFrame);
  const candidates = new Set<number>([requested, 0, maxStart]);
  for (const candidate of sorted) {
    candidates.add(Math.max(0, Math.min(candidate.startFrame - duration, maxStart)));
    candidates.add(Math.max(0, Math.min(candidate.endFrame, maxStart)));
  }

  let best = requestedStart as number;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const end = candidate + duration;
    const overlaps = sorted.some(
      (existing) => candidate < existing.endFrame && end > existing.startFrame,
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
  private readonly selectedCaptions: Set<CaptionId> = new Set();

  // ── Per-gesture tracking ───────────────────────────────────────────────
  private mode:             DragMode      = 'idle';

  // drag-clip mode
  private dragStartFrame:   TimelineFrame | null     = null;
  private dragStartX:       number        | null     = null;
  private dragStartY:       number        | null     = null;
  private dragClipId:       ClipId        | null     = null;
  private isMultiDrag:      boolean                  = false;
  private originalPositions: Map<ClipId, OriginalPosition> = new Map();

  // near-edge trim (click-based, not drag mode)
  private pendingTrimEdge:  TrimEdge      | null = null;

  // drag-caption mode
  private dragCaptionId:       CaptionId     | null = null;
  private dragCaptionTrackId:  TrackId       | null = null;
  private dragCaptionOrigStart: TimelineFrame | null = null;
  private dragCaptionOrigEnd:   TimelineFrame | null = null;

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
    this.selectedCaptions.clear();
  }

  getCaptionSelection(): ReadonlySet<CaptionId> {
    return this.selectedCaptions;
  }

  // ── ITool: getCursor ────────────────────────────────────────────────────

  getCursor(_ctx: ToolContext): string {
    if (this.mode === 'drag-clip')    return 'grabbing';
    if (this.mode === 'drag-caption') return 'grabbing';
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

      // Check if we're hitting an edge — record but don't switch to trim mode yet
      const edge = hitEdge(clip, event.x, ctx.pixelsPerFrame, 0);
      this.pendingTrimEdge = edge;

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
    } else if (event.captionId !== null && event.trackId !== null) {
      // Caption drag — find the caption on the track
      const track = ctx.state.timeline.tracks.find((t) => t.id === event.trackId);
      const caption = track?.captions.find((c) => c.id === event.captionId);
      if (!caption) return;

      // Handle caption selection
      if (event.shiftKey) {
        if (this.selectedCaptions.has(event.captionId)) {
          this.selectedCaptions.delete(event.captionId);
        } else {
          this.selectedCaptions.add(event.captionId);
        }
      } else {
        if (!this.selectedCaptions.has(event.captionId)) {
          this.selectedCaptions.clear();
          this.selectedCaptions.add(event.captionId);
        }
      }

      this.mode = 'drag-caption';
      this.dragStartX = event.x;
      this.dragStartY = event.y;
      this.dragStartFrame = event.frame;
      this.dragCaptionId = event.captionId;
      this.dragCaptionTrackId = event.trackId;
      this.dragCaptionOrigStart = caption.startFrame;
      this.dragCaptionOrigEnd = caption.endFrame;
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

    // ── MODE 5: caption drag (with provisional ghost) ───────────────────
    if (this.mode === 'drag-caption') {
      if (this.dragStartX === null || this.dragCaptionId === null || this.dragCaptionTrackId === null) return null;
      const dxPx = Math.abs(event.x - this.dragStartX);
      if (dxPx < DRAG_THRESHOLD_PX) return null;

      const origStart = this.dragCaptionOrigStart;
      const origEnd = this.dragCaptionOrigEnd;
      if (origStart === null || origEnd === null) return null;

      const frameDelta = (event.frame - this.dragStartFrame!) as TimelineFrame;
      const duration = (origEnd - origStart) as TimelineFrame;

      // Snap caption start to nearby snap points
      const rawTarget = (origStart + frameDelta) as TimelineFrame;
      const snappedStart = ctx.snap(rawTarget, [this.dragCaptionId], ['ClipStart', 'ClipEnd', 'Playhead']);

      // Collision avoidance: find non-overlapping position
      const track = ctx.state.timeline.tracks.find((t) => t.id === this.dragCaptionTrackId);
      const otherCaptions = track?.captions.filter((c) => c.id !== this.dragCaptionId) ?? [];
      const clampedStart = validCaptionStart(ctx.state, otherCaptions, snappedStart, duration);

      const newEnd = (clampedStart + duration) as TimelineFrame;

      // Create ghost caption at preview position
      const origCaption = track?.captions.find((c) => c.id === this.dragCaptionId);
      const ghostCaption: Caption & { readonly _trackId?: TrackId } = {
        id: this.dragCaptionId,
        text: origCaption?.text ?? '',
        startFrame: clampedStart,
        endFrame: newEnd,
        language: origCaption?.language ?? 'en-US',
        style: origCaption?.style ?? { fontFamily: 'Arial', fontSize: 14, color: '#fff', backgroundColor: '#000', hAlign: 'center', vAlign: 'bottom' },
        burnIn: origCaption?.burnIn ?? false,
        _trackId: this.dragCaptionTrackId,
      };

      return {
        clips: [],
        captions: [ghostCaption],
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
    const savedPendingTrimEdge = this.pendingTrimEdge;
    const savedCaptionId      = this.dragCaptionId;
    const savedCaptionTrackId = this.dragCaptionTrackId;
    const savedCaptionOrigStart = this.dragCaptionOrigStart;
    const savedCaptionOrigEnd   = this.dragCaptionOrigEnd;

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

    // ── MODE 5: caption drag complete ────────────────────────────────────
    if (previousMode === 'drag-caption') {
      if (savedCaptionId === null || savedCaptionTrackId === null) return null;
      if (savedCaptionOrigStart === null || savedCaptionOrigEnd === null) return null;

      const dxPx = savedDragStartX !== null ? Math.abs(event.x - savedDragStartX) : 0;
      if (dxPx < DRAG_THRESHOLD_PX) return null; // click, not drag

      const frameDelta = (event.frame - (savedDragStartFrame ?? event.frame)) as TimelineFrame;
      const rawTarget = (savedCaptionOrigStart + frameDelta) as TimelineFrame;

      // Snap caption start to nearby snap points
      const snappedStart = ctx.snap(rawTarget, [savedCaptionId], ['ClipStart', 'ClipEnd', 'Playhead']);

      // Collision avoidance: find non-overlapping position
      const track = ctx.state.timeline.tracks.find((t) => t.id === savedCaptionTrackId);
      const otherCaptions = track?.captions.filter((c) => c.id !== savedCaptionId) ?? [];
      const duration = (savedCaptionOrigEnd - savedCaptionOrigStart) as TimelineFrame;
      const clampedStart = validCaptionStart(ctx.state, otherCaptions, snappedStart, duration);
      const clampedEnd = (clampedStart + duration) as TimelineFrame;

      if (clampedStart === savedCaptionOrigStart) return null; // no movement

      return {
        id: txId(),
        label: 'Move Caption',
        timestamp: Date.now(),
        operations: [{
          type: 'EDIT_CAPTION',
          captionId: savedCaptionId,
          trackId: savedCaptionTrackId,
          startFrame: clampedStart,
          endFrame: clampedEnd,
        }],
      };
    }

    if (previousMode !== 'drag-clip') return null;

    // ── Below drag threshold — click or near-edge trim ──────────────────
    const dxPx = savedDragStartX !== null ? Math.abs(event.x - savedDragStartX) : 0;
    if (dxPx < DRAG_THRESHOLD_PX) {
      // Near-edge click → trim (ripple by default, roll with Alt)
      if (savedPendingTrimEdge !== null && savedDragClipId !== null) {
        const clip = liveClip(ctx.state, savedDragClipId);
        if (!clip) return null;

        const rawFrame = event.frame;
        const snapped = ctx.snap(rawFrame, [savedDragClipId]) as TimelineFrame;

        let newFrame: TimelineFrame;
        if (savedPendingTrimEdge === 'end') {
          const minEnd = (clip.timelineStart + MIN_DURATION_FRAMES) as TimelineFrame;
          newFrame = Math.max(snapped, minEnd) as TimelineFrame;
        } else {
          const maxStart = (clip.timelineEnd - MIN_DURATION_FRAMES) as TimelineFrame;
          newFrame = Math.min(Math.max(snapped, 0), maxStart) as TimelineFrame;
        }

        const originalEdge = savedPendingTrimEdge === 'end' ? clip.timelineEnd : clip.timelineStart;
        if (newFrame === originalEdge) return null;

        // Alt/Option held → roll trim (resize both clips at cut point, no ripple)
        if (event.altKey) {
          // Find the adjacent clip at the cut point
          const track = ctx.state.timeline.tracks.find(t => t.id === clip.trackId);
          if (!track) return null;

          let leftClip: typeof clip | null = null;
          let rightClip: typeof clip | null = null;

          if (savedPendingTrimEdge === 'end') {
            // Trimming end of this clip → find clip whose start matches this clip's end
            leftClip = clip;
            rightClip = track.clips.find(
              c => c.id !== clip.id && c.timelineStart === clip.timelineEnd,
            ) ?? null;
          } else {
            // Trimming start of this clip → find clip whose end matches this clip's start
            rightClip = clip;
            leftClip = track.clips.find(
              c => c.id !== clip.id && c.timelineEnd === clip.timelineStart,
            ) ?? null;
          }

          // Roll trim: both clips resize to newFrame, no downstream shift
          const operations: Transaction['operations'][number][] = [
            { type: 'RESIZE_CLIP', clipId: clip.id, edge: savedPendingTrimEdge, newFrame },
          ];

          if (leftClip && rightClip && leftClip.id !== rightClip.id) {
            // Adjacent clip exists — resize it too to maintain adjacency
            const adjacentClip = savedPendingTrimEdge === 'end' ? rightClip : leftClip;
            const adjacentEdge = savedPendingTrimEdge === 'end' ? 'start' : 'end';
            operations.push({
              type: 'RESIZE_CLIP',
              clipId: adjacentClip.id,
              edge: adjacentEdge,
              newFrame,
            });
          }

          return {
            id: txId(),
            label: 'Roll Trim',
            timestamp: Date.now(),
            operations,
          };
        }

        // Default: ripple trim — resize this clip, shift downstream clips
        const delta = (newFrame - originalEdge) as TimelineFrame;

        // Find downstream clips to shift
        const downstreamClips: typeof clip[] = [];
        if (savedPendingTrimEdge === 'end') {
          // END edge trim: clips with timelineStart >= clip.timelineEnd (to the right)
          for (const track of ctx.state.timeline.tracks) {
            for (const c of track.clips) {
              if (c.id !== clip.id && c.timelineStart >= clip.timelineEnd) {
                downstreamClips.push(c);
              }
            }
          }
        } else {
          // START edge trim: clips with timelineEnd <= clip.timelineStart (to the left)
          for (const track of ctx.state.timeline.tracks) {
            for (const c of track.clips) {
              if (c.id !== clip.id && c.timelineEnd <= clip.timelineStart) {
                downstreamClips.push(c);
              }
            }
          }
        }

        const operations: Transaction['operations'][number][] = [
          { type: 'RESIZE_CLIP', clipId: clip.id, edge: savedPendingTrimEdge, newFrame },
          ...downstreamClips.map(c => ({
            type: 'MOVE_CLIP' as const,
            clipId: c.id,
            newTimelineStart: (c.timelineStart + delta) as TimelineFrame,
          })),
        ];

        return {
          id: txId(),
          label: 'Ripple Trim',
          timestamp: Date.now(),
          operations,
        };
      }
      if (event.clipId !== null) {
        if (event.shiftKey) {
          if (this.selected.has(event.clipId)) this.selected.delete(event.clipId);
          else                                  this.selected.add(event.clipId);
        } else {
          this.selected.clear();
          this.selected.add(event.clipId);
        }
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
    this.mode                  = 'idle';
    this.dragStartFrame        = null;
    this.dragStartX            = null;
    this.dragStartY            = null;
    this.dragClipId            = null;
    this.isMultiDrag           = false;
    this.originalPositions.clear();
    this.pendingTrimEdge       = null;
    this.rubberBandStartFrame  = null;
    this.rubberBandStartY      = null;
    this.lastClientX           = null;
    this.lastHitEdge           = null;
    this._lastHoveredClipId    = null;
    this.selectedCaptions.clear();
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private _resetDragState(): void {
    this.mode                  = 'idle';
    this.dragStartFrame        = null;
    this.dragStartX            = null;
    this.dragStartY            = null;
    this.isMultiDrag           = false;
    this.originalPositions.clear();
    this.pendingTrimEdge       = null;
    this.dragCaptionId         = null;
    this.dragCaptionTrackId    = null;
    this.dragCaptionOrigStart  = null;
    this.dragCaptionOrigEnd    = null;
    this.rubberBandStartFrame  = null;
    this.rubberBandStartY      = null;
  }
}
