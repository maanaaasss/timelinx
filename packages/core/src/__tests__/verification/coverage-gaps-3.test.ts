/**
 * COMPREHENSIVE COVERAGE TESTS — selection.ts and validators.ts
 *
 * These tests aim to cover the remaining uncovered branches.
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
import { toTrackGroupId } from '../../types/track-group';
import type {
  ToolContext,
  TimelinePointerEvent,
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
    name: 'Test',
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

describe('Coverage: selection.ts — rubber-band mode', () => {
  let tool: SelectionTool;
  let state: TimelineState;

  beforeEach(() => {
    tool = new SelectionTool();
    state = makeState();
  });

  it('rubber-band selects clips within swept region', () => {
    const ctx = makeCtx(state);

    // Start rubber-band from frame 50 to frame 250 (intersects both clips)
    tool.onPointerDown(makeEv({ clipId: null, frame: toFrame(50), x: 0, y: 0 }), ctx);
    tool.onPointerMove(makeEv({ clipId: null, frame: toFrame(250), x: 500, y: 48 }), ctx);
    tool.onPointerUp(makeEv({ clipId: null, frame: toFrame(250), x: 500, y: 48 }), ctx);

    // Should have selected both clips
    expect(tool.getSelection().has(CLIP_A_ID)).toBe(true);
    expect(tool.getSelection().has(CLIP_B_ID)).toBe(true);
  });

  it('rubber-band selects only clips within the swept region', () => {
    const ctx = makeCtx(state);

    // Start rubber-band from frame 0 to frame 50 (only intersects clip-a)
    tool.onPointerDown(makeEv({ clipId: null, frame: toFrame(0), x: 0, y: 0 }), ctx);
    tool.onPointerMove(makeEv({ clipId: null, frame: toFrame(50), x: 500, y: 48 }), ctx);
    tool.onPointerUp(makeEv({ clipId: null, frame: toFrame(50), x: 500, y: 48 }), ctx);

    // Should have selected only clip-a
    expect(tool.getSelection().has(CLIP_A_ID)).toBe(true);
    expect(tool.getSelection().has(CLIP_B_ID)).toBe(false);
  });
});

describe('Coverage: selection.ts — multi-clip drag', () => {
  let tool: SelectionTool;
  let state: TimelineState;

  beforeEach(() => {
    tool = new SelectionTool();
    state = makeState();
  });

  it('dragging selected clip moves all selected clips', () => {
    const ctx = makeCtx(state);

    // Select both clips
    tool.onPointerDown(makeEv({ clipId: CLIP_A_ID, x: 50 }), ctx);
    tool.onPointerUp(makeEv({ clipId: CLIP_A_ID, x: 51 }), ctx);
    tool.onPointerDown(makeEv({ clipId: CLIP_B_ID, x: 200, shiftKey: true }), ctx);
    tool.onPointerUp(makeEv({ clipId: CLIP_B_ID, x: 201, shiftKey: true }), ctx);
    expect(tool.getSelection().size).toBe(2);

    // Drag one of the selected clips
    tool.onPointerDown(makeEv({ clipId: CLIP_A_ID, frame: toFrame(0), x: 0 }), ctx);
    tool.onPointerMove(makeEv({ clipId: CLIP_A_ID, frame: toFrame(50), x: 500 }), ctx);
    const tx = tool.onPointerUp(makeEv({ clipId: CLIP_A_ID, frame: toFrame(50), x: 500 }), ctx);

    // Should produce MOVE_CLIP for both clips
    expect(tx).not.toBeNull();
    if (tx) {
      expect(tx.operations).toHaveLength(2);
      expect(tx.operations.every(op => op.type === 'MOVE_CLIP')).toBe(true);
    }
  });
});

describe('Coverage: validators.ts — additional validator paths', () => {
  it('SET_TRACK_BLEND_MODE with valid track succeeds', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Blend', [{
      type: 'SET_TRACK_BLEND_MODE',
      trackId: toTrackId('track-1'),
      blendMode: 'multiply',
    }]));
    expect(result.accepted).toBe(true);
  });

  it('SET_TRACK_BLEND_MODE with non-existent track is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Blend', [{
      type: 'SET_TRACK_BLEND_MODE',
      trackId: toTrackId('nonexistent'),
      blendMode: 'multiply',
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) {
      expect(result.reason).toBe('TRACK_NOT_FOUND');
    }
  });

  it('REORDER_TRACK with valid track succeeds', () => {
    const state = makeState();
    // Add a second track first
    const stateWith2Tracks = dispatch(state, makeTx('Add Track', [{
      type: 'ADD_TRACK',
      track: createTrack({ id: 'track-2', name: 'V2', type: 'video', clips: [] }),
    }]));
    expect(stateWith2Tracks.accepted).toBe(true);
    if (!stateWith2Tracks.accepted) return;

    // Reorder tracks
    const result = dispatch(stateWith2Tracks.nextState, makeTx('Reorder', [{
      type: 'REORDER_TRACK',
      trackId: toTrackId('track-1'),
      newIndex: 1,
    }]));
    expect(result.accepted).toBe(true);
  });

  it('REORDER_TRACK with non-existent track is no-op', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Reorder', [{
      type: 'REORDER_TRACK',
      trackId: toTrackId('nonexistent'),
      newIndex: 0,
    }]));
    // This should succeed but be a no-op
    expect(result.accepted).toBe(true);
  });

  it('SET_SEQUENCE_SETTINGS succeeds', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Seq', [{
      type: 'SET_SEQUENCE_SETTINGS',
      settings: { width: 1920, height: 1080 },
    }]));
    expect(result.accepted).toBe(true);
  });

  it('SET_TIMELINE_START_TC succeeds', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set TC', [{
      type: 'SET_TIMELINE_START_TC',
      startTimecode: toTimecode('01:00:00:00'),
    }]));
    expect(result.accepted).toBe(true);
  });

  it('SET_TRACK_HEIGHT succeeds', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Height', [{
      type: 'SET_TRACK_HEIGHT',
      trackId: toTrackId('track-1'),
      height: 80,
    }]));
    expect(result.accepted).toBe(true);
  });

  it('SET_TRACK_NAME succeeds', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Name', [{
      type: 'SET_TRACK_NAME',
      trackId: toTrackId('track-1'),
      name: 'My Track',
    }]));
    expect(result.accepted).toBe(true);
  });

  it('SET_ASSET_STATUS succeeds', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Status', [{
      type: 'SET_ASSET_STATUS',
      assetId: toAssetId('asset-1'),
      status: 'offline',
    }]));
    expect(result.accepted).toBe(true);
  });

  it('SET_CLIP_COLOR succeeds', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Color', [{
      type: 'SET_CLIP_COLOR',
      clipId: toClipId('clip-a'),
      color: '#FF0000',
    }]));
    expect(result.accepted).toBe(true);
  });

  it('SET_CLIP_NAME succeeds', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Name', [{
      type: 'SET_CLIP_NAME',
      clipId: toClipId('clip-a'),
      name: 'My Clip',
    }]));
    expect(result.accepted).toBe(true);
  });

  it('SET_CLIP_REVERSED succeeds', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Reversed', [{
      type: 'SET_CLIP_REVERSED',
      clipId: toClipId('clip-a'),
      reversed: true,
    }]));
    expect(result.accepted).toBe(true);
  });

  it('REMOVE_BEAT_GRID succeeds', () => {
    const state = makeState();
    // First add a beat grid
    const stateWithBeatGrid = dispatch(state, makeTx('Add Beat', [{
      type: 'ADD_BEAT_GRID',
      beatGrid: { bpm: 120, timeSignature: [4, 4], offset: toFrame(0) },
    }]));
    expect(stateWithBeatGrid.accepted).toBe(true);
    if (!stateWithBeatGrid.accepted) return;

    // Remove it
    const result = dispatch(stateWithBeatGrid.nextState, makeTx('Remove Beat', [{
      type: 'REMOVE_BEAT_GRID',
    }]));
    expect(result.accepted).toBe(true);
  });

  it('REMOVE_BEAT_GRID when none exists succeeds', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Remove Beat', [{
      type: 'REMOVE_BEAT_GRID',
    }]));
    // Should succeed even if no beat grid exists
    expect(result.accepted).toBe(true);
  });
});
