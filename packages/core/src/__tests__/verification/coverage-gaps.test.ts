/**
 * TARGETED TESTS — Coverage Gap Closure
 *
 * These tests specifically target uncovered branches in:
 * - validators.ts: lines 771-772 (validateSetTrackOpacity success path)
 * - selection.ts: lines 435-436 (rubber-band click clear), 505-506 (onKeyDown)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SelectionTool } from '../../tools/selection';
import { checkInvariants } from '../../validation/invariants';
import { dispatch } from '../../engine/dispatcher';
import { createTimelineState } from '../../types/state';
import { createTimeline } from '../../types/timeline';
import { createTrack, toTrackId } from '../../types/track';
import { createClip, toClipId } from '../../types/clip';
import { createAsset, toAssetId } from '../../types/asset';
import { toFrame, toTimecode, frameRate } from '../../types/frame';
import { buildSnapIndex } from '../../snap-index';
import type {
  ToolContext,
  TimelinePointerEvent,
  TimelineKeyEvent,
} from '../../tools/types';
import type { TimelineState } from '../../types/state';
import type { TimelineFrame } from '../../types/frame';
import type { TrackId } from '../../types/track';
import type { ClipId } from '../../types/clip';
import type { Transaction } from '../../types/operations';

// ── Fixtures ────────────────────────────────────────────────────────────────

const ASSET_ID = toAssetId('asset-1');
const TRACK_ID = toTrackId('track-1');
const CLIP_A_ID = toClipId('clip-a');
const CLIP_B_ID = toClipId('clip-b');

function makeState(): TimelineState {
  const asset = createAsset({
    id: 'asset-1',
    name: 'Test Asset',
    mediaType: 'video',
    filePath: '/media/test.mp4',
    intrinsicDuration: toFrame(600),
    nativeFps: 30,
    sourceTimecodeOffset: toFrame(0),
    status: 'online',
  });

  const clipA = createClip({
    id: 'clip-a',
    assetId: 'asset-1',
    trackId: 'track-1',
    timelineStart: toFrame(0),
    timelineEnd: toFrame(100),
    mediaIn: toFrame(0),
    mediaOut: toFrame(100),
  });

  const clipB = createClip({
    id: 'clip-b',
    assetId: 'asset-1',
    trackId: 'track-1',
    timelineStart: toFrame(200),
    timelineEnd: toFrame(300),
    mediaIn: toFrame(0),
    mediaOut: toFrame(100),
  });

  const track = createTrack({
    id: 'track-1',
    name: 'V1',
    type: 'video',
    clips: [clipA, clipB],
  });

  const timeline = createTimeline({
    id: 'tl',
    name: 'Selection Test',
    fps: frameRate(30),
    duration: toFrame(9000),
    startTimecode: toTimecode('00:00:00:00'),
    tracks: [track],
  });

  return createTimelineState({
    timeline,
    assetRegistry: new Map([[ASSET_ID, asset]]),
  });
}

function makeCtx(
  state: TimelineState,
  overrides: Partial<ToolContext> = {},
): ToolContext {
  return {
    state,
    snapIndex: buildSnapIndex(state, toFrame(0)),
    pixelsPerFrame: 10,
    modifiers: { shift: false, alt: false, ctrl: false, meta: false },
    frameAtX: (x) => toFrame(Math.floor(x / 10)),
    trackAtY: (_y) => TRACK_ID,
    snap: (frame, _exclude?) => frame,
    ...overrides,
  };
}

function makeEv(overrides: {
  frame?: TimelineFrame;
  trackId?: TrackId | null;
  clipId?: ClipId | null;
  captionId?: import('@timelinx/core').CaptionId | null;
  x?: number;
  y?: number;
  buttons?: number;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
} = {}): TimelinePointerEvent {
  return {
    frame: overrides.frame ?? toFrame(0),
    trackId: overrides.trackId ?? TRACK_ID,
    clipId: overrides.clipId ?? null,
    captionId: overrides.captionId ?? null,
    x: overrides.x ?? 0,
    y: overrides.y ?? 24,
    buttons: overrides.buttons ?? 1,
    shiftKey: overrides.shiftKey ?? false,
    altKey: overrides.altKey ?? false,
    metaKey: overrides.metaKey ?? false,
  };
}

function makeTx(label: string, ops: Transaction['operations']): Transaction {
  return {
    id: `tx-${Date.now()}-${Math.random()}`,
    label,
    timestamp: Date.now(),
    operations: ops,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Coverage: validators.ts — validateSetTrackOpacity success path', () => {
  it('SET_TRACK_OPACITY with valid opacity succeeds via dispatcher', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Opacity', [{
      type: 'SET_TRACK_OPACITY',
      trackId: toTrackId('track-1'),
      opacity: 0.7,
    }]));
    expect(result.accepted).toBe(true);
    if (result.accepted) {
      expect(result.nextState.timeline.tracks[0]!.opacity).toBe(0.7);
      expect(checkInvariants(result.nextState)).toEqual([]);
    }
  });

  it('SET_TRACK_OPACITY with 0 succeeds via dispatcher', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Opacity', [{
      type: 'SET_TRACK_OPACITY',
      trackId: toTrackId('track-1'),
      opacity: 0,
    }]));
    expect(result.accepted).toBe(true);
  });

  it('SET_TRACK_OPACITY with 1 succeeds via dispatcher', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Opacity', [{
      type: 'SET_TRACK_OPACITY',
      trackId: toTrackId('track-1'),
      opacity: 1,
    }]));
    expect(result.accepted).toBe(true);
  });
});

describe('Coverage: selection.ts — rubber-band click clear', () => {
  let tool: SelectionTool;
  let state: TimelineState;

  beforeEach(() => {
    tool = new SelectionTool();
    state = makeState();
  });

  it('click on empty space during rubber-band clears selection', () => {
    const ctx = makeCtx(state);

    // Select a clip first
    tool.onPointerDown(makeEv({ clipId: CLIP_A_ID, x: 50 }), ctx);
    tool.onPointerUp(makeEv({ clipId: CLIP_A_ID, x: 51 }), ctx);
    expect(tool.getSelection().size).toBe(1);

    // Start rubber-band on empty space
    tool.onPointerDown(makeEv({ clipId: null, x: 500, y: 100 }), ctx);
    // Move below threshold (drag < 4px)
    tool.onPointerUp(makeEv({ clipId: null, x: 501, y: 100 }), ctx);

    // Selection should be cleared
    expect(tool.getSelection().size).toBe(0);
  });
});

describe('Coverage: selection.ts — onKeyDown', () => {
  let tool: SelectionTool;
  let state: TimelineState;

  beforeEach(() => {
    tool = new SelectionTool();
    state = makeState();
  });

  it('onKeyDown returns null', () => {
    const ctx = makeCtx(state);
    const keyEvent: TimelineKeyEvent = {
      key: 'ArrowLeft',
      code: 'ArrowLeft',
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    };
    const result = tool.onKeyDown(keyEvent, ctx);
    expect(result).toBeNull();
  });
});
