/**
 * FINAL COVERAGE TESTS — targeting remaining uncovered branches
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SelectionTool } from '../../tools/selection';
import { dispatch } from '../../engine/dispatcher';
import { createTimelineState } from '../../types/state';
import { createTimeline } from '../../types/timeline';
import { createTrack, toTrackId } from '../../types/track';
import { createClip, toClipId } from '../../types/clip';
import { createAsset, toAssetId } from '../../types/asset';
import { toFrame, toTimecode, frameRate } from '../../types/frame';
import { buildSnapIndex } from '../../snap-index';
import type { ToolContext, TimelinePointerEvent } from '../../tools/types';
import type { TimelineState } from '../../types/state';
import type { TimelineFrame } from '../../types/frame';
import type { TrackId } from '../../types/track';
import type { ClipId } from '../../types/clip';
import type { Transaction } from '../../types/operations';

const ASSET_ID = toAssetId('asset-1');
const TRACK_ID = toTrackId('track-1');
const CLIP_A_ID = toClipId('clip-a');
const CLIP_B_ID = toClipId('clip-b');

function makeState(): TimelineState {
  const asset = createAsset({
    id: 'asset-1', name: 'Test Asset', mediaType: 'video',
    filePath: '/media/test.mp4', intrinsicDuration: toFrame(600),
    nativeFps: 30, sourceTimecodeOffset: toFrame(0), status: 'online',
  });
  const clipA = createClip({
    id: 'clip-a', assetId: 'asset-1', trackId: 'track-1',
    timelineStart: toFrame(0), timelineEnd: toFrame(100),
    mediaIn: toFrame(0), mediaOut: toFrame(100),
  });
  const clipB = createClip({
    id: 'clip-b', assetId: 'asset-1', trackId: 'track-1',
    timelineStart: toFrame(200), timelineEnd: toFrame(300),
    mediaIn: toFrame(0), mediaOut: toFrame(100),
  });
  const track = createTrack({ id: 'track-1', name: 'V1', type: 'video', clips: [clipA, clipB] });
  const timeline = createTimeline({
    id: 'tl', name: 'Test', fps: frameRate(30), duration: toFrame(9000),
    startTimecode: toTimecode('00:00:00:00'), tracks: [track],
  });
  return createTimelineState({ timeline, assetRegistry: new Map([[ASSET_ID, asset]]) });
}

function makeCtx(state: TimelineState, overrides: Partial<ToolContext> = {}): ToolContext {
  return {
    state, snapIndex: buildSnapIndex(state, toFrame(0)), pixelsPerFrame: 10,
    modifiers: { shift: false, alt: false, ctrl: false, meta: false },
    frameAtX: (x) => toFrame(Math.floor(x / 10)),
    trackAtY: (_y) => TRACK_ID,
    snap: (frame, _exclude?) => frame, ...overrides,
  };
}

function makeEv(overrides: {
  frame?: TimelineFrame; trackId?: TrackId | null; clipId?: ClipId | null;
  x?: number; y?: number; shiftKey?: boolean;
} = {}): TimelinePointerEvent {
  return {
    frame: overrides.frame ?? toFrame(0), trackId: overrides.trackId ?? TRACK_ID,
    clipId: overrides.clipId ?? null, x: overrides.x ?? 0, y: overrides.y ?? 24,
    buttons: 1, shiftKey: overrides.shiftKey ?? false, altKey: false, metaKey: false,
  };
}

function makeTx(label: string, ops: Transaction['operations']): Transaction {
  return { id: `tx-${Date.now()}-${Math.random()}`, label, timestamp: Date.now(), operations: ops };
}

describe('Coverage: selection.ts — trim-edge via near-edge click', () => {
  let tool: SelectionTool;
  let state: TimelineState;
  beforeEach(() => { tool = new SelectionTool(); state = makeState(); });

  it('click near end edge then release produces RESIZE_CLIP', () => {
    const ctx = makeCtx(state);
    tool.onPointerDown(makeEv({ clipId: CLIP_A_ID, frame: toFrame(100), x: 1000 }), ctx);
    tool.onPointerMove(makeEv({ clipId: CLIP_A_ID, frame: toFrame(99), x: 1002 }), ctx);
    const tx = tool.onPointerUp(makeEv({ clipId: CLIP_A_ID, frame: toFrame(99), x: 1002 }), ctx);
    expect(tx).not.toBeNull();
    if (tx) {
      expect(tx.operations).toHaveLength(1);
      expect(tx.operations[0]!.type).toBe('RESIZE_CLIP');
    }
  });

  it('click near start edge then release produces RESIZE_CLIP', () => {
    const ctx = makeCtx(state);
    tool.onPointerDown(makeEv({ clipId: CLIP_A_ID, frame: toFrame(0), x: 0 }), ctx);
    tool.onPointerMove(makeEv({ clipId: CLIP_A_ID, frame: toFrame(1), x: 2 }), ctx);
    const tx = tool.onPointerUp(makeEv({ clipId: CLIP_A_ID, frame: toFrame(1), x: 2 }), ctx);
    expect(tx).not.toBeNull();
    if (tx) {
      expect(tx.operations).toHaveLength(1);
      expect(tx.operations[0]!.type).toBe('RESIZE_CLIP');
    }
  });

  it('click near end edge then click elsewhere clears pending trim', () => {
    const ctx = makeCtx(state);
    tool.onPointerDown(makeEv({ clipId: CLIP_A_ID, frame: toFrame(100), x: 1000 }), ctx);
    tool.onPointerUp(makeEv({ clipId: CLIP_A_ID, frame: toFrame(100), x: 1000 }), ctx);
    tool.onPointerDown(makeEv({ clipId: CLIP_A_ID, x: 50 }), ctx);
    const tx = tool.onPointerUp(makeEv({ clipId: CLIP_A_ID, x: 51 }), ctx);
    expect(tx).toBeNull();
  });
});

describe('Coverage: selection.ts — click to deselect (lines 434-436)', () => {
  let tool: SelectionTool;
  let state: TimelineState;
  beforeEach(() => { tool = new SelectionTool(); state = makeState(); });

  it('click on empty space clears selection', () => {
    const ctx = makeCtx(state);
    tool.onPointerDown(makeEv({ clipId: CLIP_A_ID, x: 50 }), ctx);
    tool.onPointerUp(makeEv({ clipId: CLIP_A_ID, x: 51 }), ctx);
    expect(tool.getSelection().has(CLIP_A_ID)).toBe(true);

    tool.onPointerDown(makeEv({ clipId: null, x: 150 }), ctx);
    tool.onPointerUp(makeEv({ clipId: null, x: 151 }), ctx);
    expect(tool.getSelection().size).toBe(0);
  });

  it('click empty when nothing selected stays empty', () => {
    const ctx = makeCtx(state);
    expect(tool.getSelection().size).toBe(0);
    tool.onPointerDown(makeEv({ clipId: null, x: 150 }), ctx);
    tool.onPointerUp(makeEv({ clipId: null, x: 151 }), ctx);
    expect(tool.getSelection().size).toBe(0);
  });

  it('shift-click toggles clip in/out of selection', () => {
    const ctx = makeCtx(state);
    tool.onPointerDown(makeEv({ clipId: CLIP_A_ID, x: 50, shiftKey: true }), ctx);
    tool.onPointerUp(makeEv({ clipId: CLIP_A_ID, x: 51, shiftKey: true }), ctx);
    expect(tool.getSelection().has(CLIP_A_ID)).toBe(true);

    tool.onPointerDown(makeEv({ clipId: CLIP_B_ID, x: 200, shiftKey: true }), ctx);
    tool.onPointerUp(makeEv({ clipId: CLIP_B_ID, x: 201, shiftKey: true }), ctx);
    expect(tool.getSelection().has(CLIP_B_ID)).toBe(true);

    tool.onPointerDown(makeEv({ clipId: CLIP_A_ID, x: 50, shiftKey: true }), ctx);
    tool.onPointerUp(makeEv({ clipId: CLIP_A_ID, x: 51, shiftKey: true }), ctx);
    expect(tool.getSelection().has(CLIP_A_ID)).toBe(false);
  });
});

describe('Coverage: validators.ts — remaining branches', () => {
  it('SET_TRACK_OPACITY with NaN is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Opacity', [{
      type: 'SET_TRACK_OPACITY', trackId: toTrackId('track-1'), opacity: NaN,
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('INVALID_OPACITY');
  });

  it('SET_TRACK_OPACITY < 0 is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Opacity', [{
      type: 'SET_TRACK_OPACITY', trackId: toTrackId('track-1'), opacity: -0.1,
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('INVALID_OPACITY');
  });

  it('SET_TRACK_OPACITY > 1 is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Opacity', [{
      type: 'SET_TRACK_OPACITY', trackId: toTrackId('track-1'), opacity: 1.1,
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('INVALID_OPACITY');
  });

  it('ADD_MARKER point with frame < 0 is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Add Marker', [{
      type: 'ADD_MARKER', marker: { id: 'm1', type: 'point', frame: toFrame(-10) },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('ADD_MARKER point with frame > duration is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Add Marker', [{
      type: 'ADD_MARKER', marker: { id: 'm1', type: 'point', frame: toFrame(10000) },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('ADD_MARKER range with frameStart >= frameEnd is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Add Marker', [{
      type: 'ADD_MARKER',
      marker: { id: 'm1', type: 'range', frameStart: toFrame(100), frameEnd: toFrame(50) },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('ADD_MARKER range with frameEnd > duration is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Add Marker', [{
      type: 'ADD_MARKER',
      marker: { id: 'm1', type: 'range', frameStart: toFrame(8000), frameEnd: toFrame(10000) },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('MOVE_MARKER non-existent is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Move Marker', [{
      type: 'MOVE_MARKER', markerId: 'nonexistent', newFrame: toFrame(100),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('NOT_FOUND');
  });

  it('DELETE_MARKER non-existent is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Del Marker', [{
      type: 'DELETE_MARKER', markerId: 'nonexistent',
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('NOT_FOUND');
  });

  it('SET_IN_POINT with NaN is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set In', [{
      type: 'SET_IN_POINT', frame: NaN,
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('SET_IN_POINT < 0 is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set In', [{
      type: 'SET_IN_POINT', frame: toFrame(-1),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('SET_IN_POINT >= out point is rejected', () => {
    const state = makeState();
    const s1 = dispatch(state, makeTx('Set Out', [{ type: 'SET_OUT_POINT', frame: toFrame(100) }]));
    expect(s1.accepted).toBe(true);
    if (!s1.accepted) return;
    const result = dispatch(s1.nextState, makeTx('Set In', [{
      type: 'SET_IN_POINT', frame: toFrame(100),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('SET_OUT_POINT with NaN is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Out', [{
      type: 'SET_OUT_POINT', frame: NaN,
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('SET_OUT_POINT < 0 is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Out', [{
      type: 'SET_OUT_POINT', frame: toFrame(-1),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('SET_OUT_POINT <= in point is rejected', () => {
    const state = makeState();
    const s1 = dispatch(state, makeTx('Set In', [{ type: 'SET_IN_POINT', frame: toFrame(100) }]));
    expect(s1.accepted).toBe(true);
    if (!s1.accepted) return;
    const result = dispatch(s1.nextState, makeTx('Set Out', [{
      type: 'SET_OUT_POINT', frame: toFrame(100),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('ADD_BEAT_GRID with existing beat grid is rejected', () => {
    const state = makeState();
    const s1 = dispatch(state, makeTx('Add Beat', [{
      type: 'ADD_BEAT_GRID', beatGrid: { bpm: 120, timeSignature: [4, 4], offset: toFrame(0) },
    }]));
    expect(s1.accepted).toBe(true);
    if (!s1.accepted) return;
    const result = dispatch(s1.nextState, makeTx('Add Beat Again', [{
      type: 'ADD_BEAT_GRID', beatGrid: { bpm: 140, timeSignature: [4, 4], offset: toFrame(0) },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('BEAT_GRID_EXISTS');
  });

  it('ADD_BEAT_GRID with bpm <= 0 is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Add Beat', [{
      type: 'ADD_BEAT_GRID', beatGrid: { bpm: 0, timeSignature: [4, 4], offset: toFrame(0) },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('ADD_BEAT_GRID with negative bpm is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Add Beat', [{
      type: 'ADD_BEAT_GRID', beatGrid: { bpm: -120, timeSignature: [4, 4], offset: toFrame(0) },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('ADD_BEAT_GRID with invalid time signature [0,4] is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Add Beat', [{
      type: 'ADD_BEAT_GRID', beatGrid: { bpm: 120, timeSignature: [0, 4], offset: toFrame(0) },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('ADD_BEAT_GRID with negative time signature [4,-1] is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Add Beat', [{
      type: 'ADD_BEAT_GRID', beatGrid: { bpm: 120, timeSignature: [4, -1], offset: toFrame(0) },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('REMOVE_BEAT_GRID when none exists still succeeds', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Remove Beat', [{ type: 'REMOVE_BEAT_GRID' }]));
    expect(result.accepted).toBe(true);
  });

  it('SET_TIMELINE_DURATION with NaN is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Duration', [{
      type: 'SET_TIMELINE_DURATION', duration: NaN,
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('SET_TIMELINE_DURATION <= 0 is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Duration', [{
      type: 'SET_TIMELINE_DURATION', duration: 0,
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('SET_TIMELINE_DURATION that clips extend beyond is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Duration', [{
      type: 'SET_TIMELINE_DURATION', duration: toFrame(50),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('RESIZE_CLIP start edge >= timelineEnd is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Resize', [{
      type: 'RESIZE_CLIP', clipId: toClipId('clip-a'), edge: 'start', newFrame: toFrame(100),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('RESIZE_CLIP end edge <= timelineStart is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Resize', [{
      type: 'RESIZE_CLIP', clipId: toClipId('clip-a'), edge: 'end', newFrame: toFrame(0),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('RESIZE_CLIP with NaN newFrame is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Resize', [{
      type: 'RESIZE_CLIP', clipId: toClipId('clip-a'), edge: 'end', newFrame: NaN,
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('SLICE_CLIP with atFrame outside clip is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Slice', [{
      type: 'SLICE_CLIP', clipId: toClipId('clip-a'), atFrame: toFrame(200),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('SLICE_CLIP with atFrame at exact start is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Slice', [{
      type: 'SLICE_CLIP', clipId: toClipId('clip-a'), atFrame: toFrame(0),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('SLICE_CLIP with atFrame at exact end is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Slice', [{
      type: 'SLICE_CLIP', clipId: toClipId('clip-a'), atFrame: toFrame(100),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('SET_MEDIA_BOUNDS with mediaOut > intrinsicDuration is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Media', [{
      type: 'SET_MEDIA_BOUNDS', clipId: toClipId('clip-a'),
      mediaIn: toFrame(0), mediaOut: toFrame(700),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('MEDIA_BOUNDS_INVALID');
  });

  it('SET_MEDIA_BOUNDS with mediaIn < 0 is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Media', [{
      type: 'SET_MEDIA_BOUNDS', clipId: toClipId('clip-a'),
      mediaIn: toFrame(-1), mediaOut: toFrame(100),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('MEDIA_BOUNDS_INVALID');
  });

  it('SET_MEDIA_BOUNDS with NaN mediaIn is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Media', [{
      type: 'SET_MEDIA_BOUNDS', clipId: toClipId('clip-a'),
      mediaIn: NaN, mediaOut: toFrame(100),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('MEDIA_BOUNDS_INVALID');
  });

  it('SET_MEDIA_BOUNDS with NaN mediaOut is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Media', [{
      type: 'SET_MEDIA_BOUNDS', clipId: toClipId('clip-a'),
      mediaIn: toFrame(0), mediaOut: NaN,
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('MEDIA_BOUNDS_INVALID');
  });

  it('SET_CLIP_SPEED <= 0 is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Speed', [{
      type: 'SET_CLIP_SPEED', clipId: toClipId('clip-a'), speed: 0,
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('SPEED_INVALID');
  });

  it('SET_CLIP_SPEED NaN is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Speed', [{
      type: 'SET_CLIP_SPEED', clipId: toClipId('clip-a'), speed: NaN,
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('SPEED_INVALID');
  });

  it('DELETE_TRACK with clips is rejected with TRACK_NOT_EMPTY', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Del Track', [{
      type: 'DELETE_TRACK', trackId: toTrackId('track-1'),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('TRACK_NOT_EMPTY');
  });

  it('DELETE_TRACK with non-existent track is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Del Track', [{
      type: 'DELETE_TRACK', trackId: toTrackId('nonexistent'),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('ADD_TRACK with duplicate ID is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Add Track', [{
      type: 'ADD_TRACK',
      track: createTrack({ id: 'track-1', name: 'Dup', type: 'video', clips: [] }),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OVERLAP');
  });

  it('MOVE_CLIP to non-existent track is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Move', [{
      type: 'MOVE_CLIP', clipId: toClipId('clip-a'),
      targetTrackId: toTrackId('nonexistent'), newTimelineStart: toFrame(0),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('MOVE_CLIP outside timeline bounds is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Move', [{
      type: 'MOVE_CLIP', clipId: toClipId('clip-a'), newTimelineStart: toFrame(-100),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('MOVE_CLIP with NaN start is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Move', [{
      type: 'MOVE_CLIP', clipId: toClipId('clip-a'), newTimelineStart: NaN,
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('UNREGISTER_ASSET in use is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Unregister', [{
      type: 'UNREGISTER_ASSET', assetId: ASSET_ID,
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('ASSET_IN_USE');
  });

  it('REGISTER_ASSET with duplicate ID is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Register', [{
      type: 'REGISTER_ASSET',
      asset: createAsset({
        id: 'asset-1', name: 'Dup', mediaType: 'video', filePath: '/x.mp4',
        intrinsicDuration: toFrame(100), nativeFps: 30,
        sourceTimecodeOffset: toFrame(0), status: 'online',
      }),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('DUPLICATE_ID');
  });

  it('UNLINK_CLIPS with non-existent group is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Unlink', [{
      type: 'UNLINK_CLIPS', linkGroupId: 'nonexistent',
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('LINK_GROUP_NOT_FOUND');
  });

  it('SET_TRACK_BLEND_MODE with non-existent track is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Blend', [{
      type: 'SET_TRACK_BLEND_MODE', trackId: toTrackId('nonexistent'), blendMode: 'multiply',
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('TRACK_NOT_FOUND');
  });

  it('LINK_CLIPS with < 2 clipIds is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Link', [{
      type: 'LINK_CLIPS',
      linkGroup: { id: 'lg-1', name: 'Link', clipIds: [toClipId('clip-a')] },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('INVALID_RANGE');
  });

  it('LINK_CLIPS with empty clipIds is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Link', [{
      type: 'LINK_CLIPS',
      linkGroup: { id: 'lg-1', name: 'Link', clipIds: [] },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('INVALID_RANGE');
  });

  it('LINK_CLIPS with non-existent clip is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Link', [{
      type: 'LINK_CLIPS',
      linkGroup: { id: 'lg-1', name: 'Link', clipIds: [toClipId('clip-a'), toClipId('nonexistent')] },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('CLIP_NOT_FOUND');
  });

  it('LINK_CLIPS with duplicate group ID is rejected', () => {
    const state = makeState();
    const s1 = dispatch(state, makeTx('Link', [{
      type: 'LINK_CLIPS',
      linkGroup: { id: 'lg-1', name: 'Link', clipIds: [toClipId('clip-a'), toClipId('clip-b')] },
    }]));
    expect(s1.accepted).toBe(true);
    if (!s1.accepted) return;
    const result = dispatch(s1.nextState, makeTx('Link Again', [{
      type: 'LINK_CLIPS',
      linkGroup: { id: 'lg-1', name: 'Link2', clipIds: [toClipId('clip-a'), toClipId('clip-b')] },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('DUPLICATE_LINK_GROUP_ID');
  });

  it('ADD_CAPTION that overlaps existing is rejected', () => {
    const state = makeState();
    const s1 = dispatch(state, makeTx('Add Caption', [{
      type: 'ADD_CAPTION', trackId: toTrackId('track-1'),
      caption: { id: 'cap-1', startFrame: toFrame(100), endFrame: toFrame(200), text: 'A' },
    }]));
    expect(s1.accepted).toBe(true);
    if (!s1.accepted) return;
    const result = dispatch(s1.nextState, makeTx('Add Caption 2', [{
      type: 'ADD_CAPTION', trackId: toTrackId('track-1'),
      caption: { id: 'cap-2', startFrame: toFrame(150), endFrame: toFrame(250), text: 'B' },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OVERLAP');
  });

  it('ADD_CAPTION with duplicate ID is rejected', () => {
    const state = makeState();
    const s1 = dispatch(state, makeTx('Add Caption', [{
      type: 'ADD_CAPTION', trackId: toTrackId('track-1'),
      caption: { id: 'cap-1', startFrame: toFrame(0), endFrame: toFrame(100), text: 'A' },
    }]));
    expect(s1.accepted).toBe(true);
    if (!s1.accepted) return;
    const result = dispatch(s1.nextState, makeTx('Add Caption 2', [{
      type: 'ADD_CAPTION', trackId: toTrackId('track-1'),
      caption: { id: 'cap-1', startFrame: toFrame(200), endFrame: toFrame(300), text: 'B' },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('ADD_CAPTION with startFrame >= endFrame is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Add Caption', [{
      type: 'ADD_CAPTION', trackId: toTrackId('track-1'),
      caption: { id: 'cap-1', startFrame: toFrame(100), endFrame: toFrame(50), text: 'A' },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('ADD_CAPTION with endFrame > duration is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Add Caption', [{
      type: 'ADD_CAPTION', trackId: toTrackId('track-1'),
      caption: { id: 'cap-1', startFrame: toFrame(8000), endFrame: toFrame(10000), text: 'A' },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('ADD_CAPTION on non-existent track is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Add Caption', [{
      type: 'ADD_CAPTION', trackId: toTrackId('nonexistent'),
      caption: { id: 'cap-1', startFrame: toFrame(0), endFrame: toFrame(100), text: 'A' },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('EDIT_CAPTION with startFrame >= endFrame is rejected', () => {
    const state = makeState();
    const s1 = dispatch(state, makeTx('Add Caption', [{
      type: 'ADD_CAPTION', trackId: toTrackId('track-1'),
      caption: { id: 'cap-1', startFrame: toFrame(100), endFrame: toFrame(200), text: 'A' },
    }]));
    expect(s1.accepted).toBe(true);
    if (!s1.accepted) return;
    const result = dispatch(s1.nextState, makeTx('Edit Caption', [{
      type: 'EDIT_CAPTION', trackId: toTrackId('track-1'), captionId: 'cap-1',
      startFrame: toFrame(200), endFrame: toFrame(100),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('EDIT_CAPTION with only startFrame >= caption.endFrame is rejected', () => {
    const state = makeState();
    const s1 = dispatch(state, makeTx('Add Caption', [{
      type: 'ADD_CAPTION', trackId: toTrackId('track-1'),
      caption: { id: 'cap-1', startFrame: toFrame(100), endFrame: toFrame(200), text: 'A' },
    }]));
    expect(s1.accepted).toBe(true);
    if (!s1.accepted) return;
    const result = dispatch(s1.nextState, makeTx('Edit Caption', [{
      type: 'EDIT_CAPTION', trackId: toTrackId('track-1'), captionId: 'cap-1',
      startFrame: toFrame(200),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('EDIT_CAPTION with only endFrame <= caption.startFrame is rejected', () => {
    const state = makeState();
    const s1 = dispatch(state, makeTx('Add Caption', [{
      type: 'ADD_CAPTION', trackId: toTrackId('track-1'),
      caption: { id: 'cap-1', startFrame: toFrame(100), endFrame: toFrame(200), text: 'A' },
    }]));
    expect(s1.accepted).toBe(true);
    if (!s1.accepted) return;
    const result = dispatch(s1.nextState, makeTx('Edit Caption', [{
      type: 'EDIT_CAPTION', trackId: toTrackId('track-1'), captionId: 'cap-1',
      endFrame: toFrame(100),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('EDIT_CAPTION endFrame > duration is rejected', () => {
    const state = makeState();
    const s1 = dispatch(state, makeTx('Add Caption', [{
      type: 'ADD_CAPTION', trackId: toTrackId('track-1'),
      caption: { id: 'cap-1', startFrame: toFrame(100), endFrame: toFrame(200), text: 'A' },
    }]));
    expect(s1.accepted).toBe(true);
    if (!s1.accepted) return;
    const result = dispatch(s1.nextState, makeTx('Edit Caption', [{
      type: 'EDIT_CAPTION', trackId: toTrackId('track-1'), captionId: 'cap-1',
      endFrame: toFrame(10000),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('DELETE_CAPTION with non-existent track is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Del Caption', [{
      type: 'DELETE_CAPTION', trackId: toTrackId('nonexistent'), captionId: 'cap-1',
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('NOT_FOUND');
  });

  it('DELETE_CAPTION with non-existent caption is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Del Caption', [{
      type: 'DELETE_CAPTION', trackId: toTrackId('track-1'), captionId: 'nonexistent',
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('NOT_FOUND');
  });

  it('EDIT_CAPTION on non-existent track is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Edit Caption', [{
      type: 'EDIT_CAPTION', trackId: toTrackId('nonexistent'), captionId: 'cap-1',
      startFrame: toFrame(0),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('NOT_FOUND');
  });

  it('EDIT_CAPTION with non-existent caption is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Edit Caption', [{
      type: 'EDIT_CAPTION', trackId: toTrackId('track-1'), captionId: 'nonexistent',
      startFrame: toFrame(0),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('NOT_FOUND');
  });

  it('ADD_CAPTION on locked track is rejected', () => {
    const state = makeState();
    const s1 = dispatch(state, makeTx('Add Track', [{
      type: 'ADD_TRACK',
      track: createTrack({ id: 'locked-cap', name: 'L', type: 'caption', clips: [], locked: true }),
    }]));
    expect(s1.accepted).toBe(true);
    if (!s1.accepted) return;
    const result = dispatch(s1.nextState, makeTx('Add Caption', [{
      type: 'ADD_CAPTION', trackId: toTrackId('locked-cap'),
      caption: { id: 'cap-1', startFrame: toFrame(0), endFrame: toFrame(100), text: 'A' },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('LOCKED_TRACK');
  });

  it('INSERT_GENERATOR on non-existent track is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Insert Gen', [{
      type: 'INSERT_GENERATOR', trackId: toTrackId('nonexistent'),
      atFrame: toFrame(0), generator: { type: 'text', duration: toFrame(100), text: 'T' },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('INSERT_GENERATOR on locked track is rejected', () => {
    const state = makeState();
    const s1 = dispatch(state, makeTx('Add Track', [{
      type: 'ADD_TRACK',
      track: createTrack({ id: 'locked-gen', name: 'L', type: 'video', clips: [], locked: true }),
    }]));
    expect(s1.accepted).toBe(true);
    if (!s1.accepted) return;
    const result = dispatch(s1.nextState, makeTx('Insert Gen', [{
      type: 'INSERT_GENERATOR', trackId: toTrackId('locked-gen'),
      atFrame: toFrame(0), generator: { type: 'text', duration: toFrame(100), text: 'T' },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('LOCKED_TRACK');
  });

  it('INSERT_GENERATOR outside timeline bounds is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Insert Gen', [{
      type: 'INSERT_GENERATOR', trackId: toTrackId('track-1'),
      atFrame: toFrame(8900), generator: { type: 'text', duration: toFrame(200), text: 'T' },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('INSERT_GENERATOR that overlaps existing clip is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Insert Gen', [{
      type: 'INSERT_GENERATOR', trackId: toTrackId('track-1'),
      atFrame: toFrame(50), generator: { type: 'text', duration: toFrame(100), text: 'T' },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OVERLAP');
  });

  it('INSERT_GENERATOR on non-video/audio track is rejected', () => {
    const state = makeState();
    const s1 = dispatch(state, makeTx('Add Track', [{
      type: 'ADD_TRACK',
      track: createTrack({ id: 'cap-track', name: 'Captions', type: 'caption', clips: [] }),
    }]));
    expect(s1.accepted).toBe(true);
    if (!s1.accepted) return;
    const result = dispatch(s1.nextState, makeTx('Insert Gen', [{
      type: 'INSERT_GENERATOR', trackId: toTrackId('cap-track'),
      atFrame: toFrame(0), generator: { type: 'text', duration: toFrame(100), text: 'T' },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('TYPE_MISMATCH');
  });

  it('SET_AUDIO_PROPERTIES pan > 1 is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Audio', [{
      type: 'SET_AUDIO_PROPERTIES', clipId: toClipId('clip-a'),
      properties: { pan: { value: 2.0 } },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('INVALID_RANGE');
  });

  it('SET_AUDIO_PROPERTIES pan < -1 is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Audio', [{
      type: 'SET_AUDIO_PROPERTIES', clipId: toClipId('clip-a'),
      properties: { pan: { value: -2.0 } },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('INVALID_RANGE');
  });

  it('SET_AUDIO_PROPERTIES normalizationGain < 0 is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Audio', [{
      type: 'SET_AUDIO_PROPERTIES', clipId: toClipId('clip-a'),
      properties: { normalizationGain: -1 },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('INVALID_RANGE');
  });

  it('SET_AUDIO_PROPERTIES on non-existent clip is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Audio', [{
      type: 'SET_AUDIO_PROPERTIES', clipId: toClipId('nonexistent'),
      properties: { pan: { value: 0.5 } },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('CLIP_NOT_FOUND');
  });

  it('SET_CLIP_TRANSFORM on non-existent clip is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Transform', [{
      type: 'SET_CLIP_TRANSFORM', clipId: toClipId('nonexistent'),
      transform: { anchorX: 0, anchorY: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('CLIP_NOT_FOUND');
  });

  it('SET_CLIP_TRANSFORM on valid clip succeeds', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Transform', [{
      type: 'SET_CLIP_TRANSFORM', clipId: toClipId('clip-a'),
      transform: { anchorX: 0, anchorY: 0, x: 10, y: 20, scaleX: 1, scaleY: 1, rotation: 0 },
    }]));
    expect(result.accepted).toBe(true);
  });

  it('ADD_TRANSITION on non-existent clip is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Add Trans', [{
      type: 'ADD_TRANSITION', clipId: toClipId('nonexistent'),
      transition: { durationFrames: 10, alignment: 'center' },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('CLIP_NOT_FOUND');
  });

  it('ADD_TRANSITION with duration <= 0 is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Add Trans', [{
      type: 'ADD_TRANSITION', clipId: toClipId('clip-a'),
      transition: { durationFrames: 0, alignment: 'center' },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('INVALID_RANGE');
  });

  it('DELETE_TRANSITION with no transition is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Del Trans', [{
      type: 'DELETE_TRANSITION', clipId: toClipId('clip-a'),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('TRANSITION_NOT_FOUND');
  });

  it('DELETE_TRANSITION on non-existent clip is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Del Trans', [{
      type: 'DELETE_TRANSITION', clipId: toClipId('nonexistent'),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('CLIP_NOT_FOUND');
  });

  it('SET_TRANSITION_DURATION with no transition is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Trans Dur', [{
      type: 'SET_TRANSITION_DURATION', clipId: toClipId('clip-a'), durationFrames: 10,
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('TRANSITION_NOT_FOUND');
  });

  it('SET_TRANSITION_DURATION on non-existent clip is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Trans Dur', [{
      type: 'SET_TRANSITION_DURATION', clipId: toClipId('nonexistent'), durationFrames: 10,
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('CLIP_NOT_FOUND');
  });

  it('SET_TRANSITION_ALIGNMENT with no transition is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Trans Align', [{
      type: 'SET_TRANSITION_ALIGNMENT', clipId: toClipId('clip-a'), alignment: 'start',
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('TRANSITION_NOT_FOUND');
  });

  it('SET_TRANSITION_ALIGNMENT on non-existent clip is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Trans Align', [{
      type: 'SET_TRANSITION_ALIGNMENT', clipId: toClipId('nonexistent'), alignment: 'start',
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('CLIP_NOT_FOUND');
  });

  it('DELETE_CLIP on non-existent clip is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Del', [{
      type: 'DELETE_CLIP', clipId: toClipId('nonexistent'),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('ASSET_MISSING');
  });

  it('INSERT_CLIP with missing asset is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Insert', [{
      type: 'INSERT_CLIP', trackId: toTrackId('track-1'),
      clip: createClip({
        id: 'new-clip', assetId: 'nonexistent', trackId: 'track-1',
        timelineStart: toFrame(500), timelineEnd: toFrame(600),
        mediaIn: toFrame(0), mediaOut: toFrame(100),
      }),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('ASSET_MISSING');
  });

  it('INSERT_CLIP with type mismatch is rejected', () => {
    const state = makeState();
    const audioAsset = createAsset({
      id: 'audio-1', name: 'Audio', mediaType: 'audio', filePath: '/a.wav',
      intrinsicDuration: toFrame(100), nativeFps: 30,
      sourceTimecodeOffset: toFrame(0), status: 'online',
    });
    const s1 = dispatch(state, makeTx('Reg', [{ type: 'REGISTER_ASSET', asset: audioAsset }]));
    expect(s1.accepted).toBe(true);
    if (!s1.accepted) return;
    const result = dispatch(s1.nextState, makeTx('Insert', [{
      type: 'INSERT_CLIP', trackId: toTrackId('track-1'),
      clip: createClip({
        id: 'new-clip', assetId: 'audio-1', trackId: 'track-1',
        timelineStart: toFrame(500), timelineEnd: toFrame(600),
        mediaIn: toFrame(0), mediaOut: toFrame(100),
      }),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('TYPE_MISMATCH');
  });

  it('INSERT_CLIP that overlaps existing clip is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Insert', [{
      type: 'INSERT_CLIP', trackId: toTrackId('track-1'),
      clip: createClip({
        id: 'new-clip', assetId: 'asset-1', trackId: 'track-1',
        timelineStart: toFrame(50), timelineEnd: toFrame(150),
        mediaIn: toFrame(0), mediaOut: toFrame(100),
      }),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('OVERLAP');
  });

  it('SET_MEDIA_BOUNDS on non-existent clip is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Media', [{
      type: 'SET_MEDIA_BOUNDS', clipId: toClipId('nonexistent'),
      mediaIn: toFrame(0), mediaOut: toFrame(100),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('ASSET_MISSING');
  });

  it('ADD_EFFECT on non-existent clip is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Add Effect', [{
      type: 'ADD_EFFECT', clipId: toClipId('nonexistent'),
      effect: { id: 'effect-1', effectType: 'blur', enabled: true, renderStage: 'preComposite', params: [], keyframes: [] },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('CLIP_NOT_FOUND');
  });

  it('REMOVE_EFFECT on non-existent clip is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Remove Effect', [{
      type: 'REMOVE_EFFECT', clipId: toClipId('nonexistent'), effectId: 'effect-1',
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('CLIP_NOT_FOUND');
  });

  it('REORDER_EFFECT on non-existent clip is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Reorder Effect', [{
      type: 'REORDER_EFFECT', clipId: toClipId('nonexistent'), effectId: 'effect-1', newIndex: 0,
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('CLIP_NOT_FOUND');
  });

  it('SET_EFFECT_ENABLED on non-existent clip is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Effect Enabled', [{
      type: 'SET_EFFECT_ENABLED', clipId: toClipId('nonexistent'), effectId: 'effect-1', enabled: true,
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('CLIP_NOT_FOUND');
  });

  it('SET_EFFECT_PARAM on non-existent clip is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Effect Param', [{
      type: 'SET_EFFECT_PARAM', clipId: toClipId('nonexistent'), effectId: 'effect-1',
      param: 'intensity', value: 0.5,
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('CLIP_NOT_FOUND');
  });

  it('ADD_KEYFRAME on non-existent clip is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Add KF', [{
      type: 'ADD_KEYFRAME', clipId: toClipId('nonexistent'), effectId: 'effect-1',
      keyframe: { id: 'kf-1', frame: toFrame(0), value: 0 },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('CLIP_NOT_FOUND');
  });

  it('MOVE_KEYFRAME on non-existent clip is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Move KF', [{
      type: 'MOVE_KEYFRAME', clipId: toClipId('nonexistent'), effectId: 'effect-1',
      keyframeId: 'kf-1', newFrame: toFrame(50),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('CLIP_NOT_FOUND');
  });

  it('DELETE_KEYFRAME on non-existent clip is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Del KF', [{
      type: 'DELETE_KEYFRAME', clipId: toClipId('nonexistent'), effectId: 'effect-1',
      keyframeId: 'kf-1',
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('CLIP_NOT_FOUND');
  });

  it('SET_KEYFRAME_EASING on non-existent clip is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Easing', [{
      type: 'SET_KEYFRAME_EASING', clipId: toClipId('nonexistent'), effectId: 'effect-1',
      keyframeId: 'kf-1', easing: 'linear',
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('CLIP_NOT_FOUND');
  });

  it('REORDER_TRACK on non-existent track succeeds as no-op', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Reorder', [{
      type: 'REORDER_TRACK', trackId: toTrackId('nonexistent'), newIndex: 0,
    }]));
    expect(result.accepted).toBe(true);
  });

  it('ADD_TRACK_GROUP with valid track IDs succeeds', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Add Group', [{
      type: 'ADD_TRACK_GROUP',
      trackGroup: { id: 'grp-1', name: 'Test', trackIds: [toTrackId('track-1')] },
    }]));
    expect(result.accepted).toBe(true);
  });

  it('ADD_TRACK_GROUP with duplicate ID is rejected', () => {
    const state = makeState();
    const s1 = dispatch(state, makeTx('Add Group', [{
      type: 'ADD_TRACK_GROUP',
      trackGroup: { id: 'grp-1', name: 'Test', trackIds: [toTrackId('track-1')] },
    }]));
    expect(s1.accepted).toBe(true);
    if (!s1.accepted) return;
    const result = dispatch(s1.nextState, makeTx('Add Group Again', [{
      type: 'ADD_TRACK_GROUP',
      trackGroup: { id: 'grp-1', name: 'Test2', trackIds: [toTrackId('track-1')] },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('DUPLICATE_TRACK_GROUP_ID');
  });

  it('ADD_TRACK_GROUP with non-existent track ID is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Add Group', [{
      type: 'ADD_TRACK_GROUP',
      trackGroup: { id: 'grp-1', name: 'Test', trackIds: [toTrackId('nonexistent')] },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('TRACK_NOT_FOUND');
  });

  it('DELETE_TRACK_GROUP with valid ID succeeds', () => {
    const state = makeState();
    const s1 = dispatch(state, makeTx('Add Group', [{
      type: 'ADD_TRACK_GROUP',
      trackGroup: { id: 'grp-1', name: 'Test', trackIds: [toTrackId('track-1')] },
    }]));
    expect(s1.accepted).toBe(true);
    if (!s1.accepted) return;
    const result = dispatch(s1.nextState, makeTx('Del Group', [{
      type: 'DELETE_TRACK_GROUP', trackGroupId: 'grp-1',
    }]));
    expect(result.accepted).toBe(true);
  });

  it('DELETE_TRACK_GROUP with non-existent ID is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Del Group', [{
      type: 'DELETE_TRACK_GROUP', trackGroupId: 'nonexistent',
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('TRACK_GROUP_NOT_FOUND');
  });

  it('SET_TRACK_OPACITY on non-existent track is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Opacity', [{
      type: 'SET_TRACK_OPACITY', trackId: toTrackId('nonexistent'), opacity: 0.5,
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('TRACK_NOT_FOUND');
  });

  it('ADD_EFFECT with duplicate effect ID is rejected', () => {
    const state = makeState();
    const s1 = dispatch(state, makeTx('Add Effect', [{
      type: 'ADD_EFFECT', clipId: toClipId('clip-a'),
      effect: { id: 'effect-1', effectType: 'blur', enabled: true, renderStage: 'preComposite', params: [], keyframes: [] },
    }]));
    expect(s1.accepted).toBe(true);
    if (!s1.accepted) return;
    const result = dispatch(s1.nextState, makeTx('Add Effect Again', [{
      type: 'ADD_EFFECT', clipId: toClipId('clip-a'),
      effect: { id: 'effect-1', effectType: 'blur', enabled: true, renderStage: 'preComposite', params: [], keyframes: [] },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('DUPLICATE_EFFECT_ID');
  });

  it('REMOVE_EFFECT with non-existent effect is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Remove Effect', [{
      type: 'REMOVE_EFFECT', clipId: toClipId('clip-a'), effectId: 'nonexistent',
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('EFFECT_NOT_FOUND');
  });

  it('REORDER_EFFECT with non-existent effect is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Reorder Effect', [{
      type: 'REORDER_EFFECT', clipId: toClipId('clip-a'), effectId: 'nonexistent', newIndex: 0,
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('EFFECT_NOT_FOUND');
  });

  it('SET_EFFECT_ENABLED with non-existent effect is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Effect Enabled', [{
      type: 'SET_EFFECT_ENABLED', clipId: toClipId('clip-a'), effectId: 'nonexistent', enabled: true,
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('EFFECT_NOT_FOUND');
  });

  it('SET_EFFECT_PARAM with non-existent effect is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Effect Param', [{
      type: 'SET_EFFECT_PARAM', clipId: toClipId('clip-a'), effectId: 'nonexistent',
      param: 'intensity', value: 0.5,
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('EFFECT_NOT_FOUND');
  });

  it('ADD_KEYFRAME with non-existent effect is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Add KF', [{
      type: 'ADD_KEYFRAME', clipId: toClipId('clip-a'), effectId: 'nonexistent',
      keyframe: { id: 'kf-1', frame: toFrame(0), value: 0 },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('EFFECT_NOT_FOUND');
  });

  it('MOVE_KEYFRAME with non-existent effect is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Move KF', [{
      type: 'MOVE_KEYFRAME', clipId: toClipId('clip-a'), effectId: 'nonexistent',
      keyframeId: 'kf-1', newFrame: toFrame(50),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('EFFECT_NOT_FOUND');
  });

  it('DELETE_KEYFRAME with non-existent effect is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Del KF', [{
      type: 'DELETE_KEYFRAME', clipId: toClipId('clip-a'), effectId: 'nonexistent',
      keyframeId: 'kf-1',
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('EFFECT_NOT_FOUND');
  });

  it('SET_KEYFRAME_EASING with non-existent effect is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Set Easing', [{
      type: 'SET_KEYFRAME_EASING', clipId: toClipId('clip-a'), effectId: 'nonexistent',
      keyframeId: 'kf-1', easing: 'linear',
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe('EFFECT_NOT_FOUND');
  });
});

describe('Coverage: selection.ts — public method clearSelection', () => {
  it('clearSelection clears all selected clips', () => {
    const state = makeState();
    const ctx = makeCtx(state);
    const tool = new SelectionTool();

    tool.onPointerDown(makeEv({ clipId: CLIP_A_ID, x: 50 }), ctx);
    tool.onPointerUp(makeEv({ clipId: CLIP_A_ID, x: 51 }), ctx);
    expect(tool.getSelection().size).toBe(1);

    tool.clearSelection();
    expect(tool.getSelection().size).toBe(0);
  });
});
