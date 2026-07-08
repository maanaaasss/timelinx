/**
 * ADDITIONAL COVERAGE TESTS — validators.ts and selection.ts
 *
 * These tests target additional uncovered branches to improve coverage.
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

  const track = createTrack({
    id: 'track-1',
    name: 'V1',
    type: 'video',
    clips: [clipA],
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

describe('Coverage: validators.ts — ADD_TRACK_GROUP', () => {
  it('ADD_TRACK_GROUP with valid track IDs succeeds via dispatcher', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Add Group', [{
      type: 'ADD_TRACK_GROUP',
      trackGroup: {
        id: toTrackGroupId('grp-1'),
        name: 'Test Group',
        trackIds: [toTrackId('track-1')],
      },
    }]));
    expect(result.accepted).toBe(true);
    if (result.accepted) {
      expect(result.nextState.timeline.trackGroups).toHaveLength(1);
    }
  });

  it('ADD_TRACK_GROUP with duplicate ID is rejected', () => {
    const state = makeState();
    // First add a group
    const stateWithGroup = dispatch(state, makeTx('Add Group', [{
      type: 'ADD_TRACK_GROUP',
      trackGroup: {
        id: toTrackGroupId('grp-1'),
        name: 'Test Group',
        trackIds: [toTrackId('track-1')],
      },
    }]));
    expect(stateWithGroup.accepted).toBe(true);
    if (!stateWithGroup.accepted) return;

    // Try to add another group with same ID
    const result = dispatch(stateWithGroup.nextState, makeTx('Add Group Again', [{
      type: 'ADD_TRACK_GROUP',
      trackGroup: {
        id: toTrackGroupId('grp-1'),
        name: 'Test Group Again',
        trackIds: [toTrackId('track-1')],
      },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) {
      expect(result.reason).toBe('DUPLICATE_TRACK_GROUP_ID');
    }
  });

  it('ADD_TRACK_GROUP with non-existent track ID is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Add Group', [{
      type: 'ADD_TRACK_GROUP',
      trackGroup: {
        id: toTrackGroupId('grp-1'),
        name: 'Test Group',
        trackIds: [toTrackId('nonexistent')],
      },
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) {
      expect(result.reason).toBe('TRACK_NOT_FOUND');
    }
  });
});

describe('Coverage: validators.ts — DELETE_TRACK_GROUP', () => {
  it('DELETE_TRACK_GROUP with valid ID succeeds via dispatcher', () => {
    const state = makeState();
    // First add a group
    const stateWithGroup = dispatch(state, makeTx('Add Group', [{
      type: 'ADD_TRACK_GROUP',
      trackGroup: {
        id: toTrackGroupId('grp-1'),
        name: 'Test Group',
        trackIds: [toTrackId('track-1')],
      },
    }]));
    expect(stateWithGroup.accepted).toBe(true);
    if (!stateWithGroup.accepted) return;

    // Delete the group
    const result = dispatch(stateWithGroup.nextState, makeTx('Delete Group', [{
      type: 'DELETE_TRACK_GROUP',
      trackGroupId: toTrackGroupId('grp-1'),
    }]));
    expect(result.accepted).toBe(true);
    if (result.accepted) {
      expect(result.nextState.timeline.trackGroups).toHaveLength(0);
    }
  });

  it('DELETE_TRACK_GROUP with non-existent ID is rejected', () => {
    const state = makeState();
    const result = dispatch(state, makeTx('Delete Group', [{
      type: 'DELETE_TRACK_GROUP',
      trackGroupId: toTrackGroupId('nonexistent'),
    }]));
    expect(result.accepted).toBe(false);
    if (!result.accepted) {
      expect(result.reason).toBe('TRACK_GROUP_NOT_FOUND');
    }
  });
});

describe('Coverage: selection.ts — trim-edge mode', () => {
  let tool: SelectionTool;
  let state: TimelineState;

  beforeEach(() => {
    tool = new SelectionTool();
    state = makeState();
  });

  it('click near edge then release without dragging produces RESIZE_CLIP', () => {
    const ctx = makeCtx(state);

    // Click near the end edge of clip-a (at frame 100, x=1000)
    // EDGE_HIT_ZONE_PX is 8, so x=1000 is exactly at the end edge
    tool.onPointerDown(makeEv({ clipId: CLIP_A_ID, frame: toFrame(100), x: 1000 }), ctx);
    
    // Move slightly (within drag threshold of 4px)
    tool.onPointerMove(makeEv({ clipId: CLIP_A_ID, frame: toFrame(99), x: 1002 }), ctx);
    
    // Release within drag threshold
    const tx = tool.onPointerUp(makeEv({ clipId: CLIP_A_ID, frame: toFrame(99), x: 1002 }), ctx);

    // Should produce a RESIZE_CLIP transaction
    expect(tx).not.toBeNull();
    if (tx) {
      expect(tx.operations).toHaveLength(1);
      expect(tx.operations[0]!.type).toBe('RESIZE_CLIP');
    }
  });
});
