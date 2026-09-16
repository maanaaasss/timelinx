/**
 * Load Tests — Stress-testing @timelinx/core at production scale
 *
 * Threshold-guarded it() tests as CI safety nets.
 * Scales: 10k clips, 100–1000 tracks.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { toFrame, toTimecode, frameRate } from '../types/frame';
import { createTimeline } from '../types/timeline';
import { createTrack, toTrackId } from '../types/track';
import { createClip } from '../types/clip';
import { createAsset } from '../types/asset';
import { createTimelineState } from '../types/state';
import { dispatch } from '../engine/dispatcher';
import { checkInvariants } from '../validation/invariants';
import { getClipsAtFrame } from '../engine/frame-resolver';
import { TrackIndex } from '../engine/track-index';
import { buildSnapIndex } from '../snap-index';
import { SnapIndexManager } from '../engine/snap-index-manager';
import { serializeTimeline, deserializeTimeline } from '../engine/serializer';
import type { TimelineState } from '../types/state';

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildScaleState(config: {
  numTracks: number;
  clipsPerTrack: number;
  clipDuration?: number;
  timelineDuration?: number;
  fps?: number;
}): TimelineState {
  const { numTracks, clipsPerTrack, clipDuration = 300, timelineDuration, fps = 30 } = config;
  const duration = timelineDuration ?? clipsPerTrack * clipDuration + 600;

  const tracks = [];
  for (let i = 0; i < numTracks; i++) {
    const type = i % 2 === 0 ? 'video' : 'audio';
    tracks.push(
      createTrack({
        id: `track-${i}`,
        name: `${type}-${i}`,
        type,
        clips: [],
      }),
    );
  }

  const timeline = createTimeline({
    id: 'load-tl',
    name: 'Load Test',
    fps: frameRate(fps),
    duration: toFrame(duration),
    startTimecode: toTimecode('00:00:00:00'),
    tracks,
  });

  const assets = [];
  for (let a = 0; a < 10; a++) {
    assets.push(
      createAsset({
        id: `asset-${a}`,
        name: `Asset ${a}`,
        mediaType: a % 2 === 0 ? 'video' : 'audio',
        filePath: `/media/${a}.mp4`,
        intrinsicDuration: toFrame(duration * 2),
        nativeFps: fps,
        sourceTimecodeOffset: toFrame(0),
        status: 'online',
      }),
    );
  }
  const registry = new Map(assets.map((a) => [a.id, a]));
  let state = createTimelineState({ timeline, assetRegistry: registry });

  const videoAssets = assets.filter((a) => a.mediaType === 'video');
  const audioAssets = assets.filter((a) => a.mediaType === 'audio');
  const operations: Array<{
    type: 'INSERT_CLIP';
    clip: ReturnType<typeof createClip>;
    trackId: ReturnType<typeof toTrackId>;
  }> = [];

  for (let t = 0; t < numTracks; t++) {
    const trackId = toTrackId(`track-${t}`);
    const isVideo = t % 2 === 0;
    const trackAssets = isVideo ? videoAssets : audioAssets;
    for (let c = 0; c < clipsPerTrack; c++) {
      const startFrame = c * clipDuration;
      const asset = trackAssets[c % trackAssets.length]!;
      const clip = createClip({
        id: `clip-t${t}-c${c}`,
        assetId: asset.id,
        trackId,
        timelineStart: toFrame(startFrame),
        timelineEnd: toFrame(startFrame + clipDuration),
        mediaIn: toFrame(0),
        mediaOut: toFrame(clipDuration),
      });
      operations.push({ type: 'INSERT_CLIP', clip, trackId });
    }
  }

  const CHUNK = 500;
  for (let i = 0; i < operations.length; i += CHUNK) {
    const chunk = operations.slice(i, i + CHUNK);
    const tx = {
      id: `load-tx-${i}`,
      label: `Batch ${i}`,
      timestamp: Date.now(),
      operations: chunk,
    };
    const result = dispatch(state, tx);
    if (!result.accepted) throw new Error(result.message);
    state = result.nextState;
  }

  return state;
}

function memMB(): number {
  if (typeof globalThis.process !== 'undefined' && globalThis.process.memoryUsage) {
    return globalThis.process.memoryUsage().heapUsed / 1024 / 1024;
  }
  return 0;
}

// ── Shared state for tests that don't need unique setups ─────────────────────

let sharedState10k: TimelineState;

beforeAll(() => {
  sharedState10k = buildScaleState({ numTracks: 100, clipsPerTrack: 100 });
}, 10000);

// ── 1. Massive Timeline Build ────────────────────────────────────────────────

describe('Load: Massive Timeline Build', () => {
  it('100 tracks × 100 clips = 10k clips builds in < 5s', () => {
    const t0 = Date.now();
    const state = buildScaleState({ numTracks: 100, clipsPerTrack: 100 });
    const elapsed = Date.now() - t0;
    const totalClips = state.timeline.tracks.reduce((n, tr) => n + tr.clips.length, 0);
    expect(totalClips).toBe(10000);
    expect(elapsed).toBeLessThan(5000);
  });
});

// ── 2. Invariant Check at Scale ──────────────────────────────────────────────

describe('Load: Invariant Check at Scale', () => {
  it('checkInvariants() on 10k clips in < 500ms', () => {
    const t0 = Date.now();
    const violations = checkInvariants(sharedState10k);
    const elapsed = Date.now() - t0;
    expect(violations).toHaveLength(0);
    expect(elapsed).toBeLessThan(500);
  });
});

// ── 3. Rapid Dispatch Throughput ─────────────────────────────────────────────

describe('Load: Rapid Dispatch Throughput', () => {
  it('500 sequential MOVE_CLIP dispatches in < 15s', () => {
    const state = buildScaleState({
      numTracks: 1,
      clipsPerTrack: 1,
      clipDuration: 100,
      timelineDuration: 500000,
    });
    let current = state;
    const track0 = current.timeline.tracks[0]!;
    const clipId = track0.clips[0]!.id;
    const t0 = Date.now();
    for (let i = 0; i < 500; i++) {
      const result = dispatch(current, {
        id: `move-${i}`,
        label: `Move ${i}`,
        timestamp: Date.now(),
        operations: [
          {
            type: 'MOVE_CLIP',
            clipId,
            newTimelineStart: toFrame(i * 100),
          },
        ],
      });
      if (!result.accepted) throw new Error(`Move ${i} rejected: ${result.message}`);
      current = result.nextState;
    }
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(15000);
  });
});

// ── 4. Batch Insert/Remove ───────────────────────────────────────────────────

describe('Load: Batch Insert/Remove', () => {
  it('insert 200 clips then remove all in < 5s', () => {
    const state = buildScaleState({
      numTracks: 2,
      clipsPerTrack: 1,
      clipDuration: 100,
      timelineDuration: 100000,
    });
    let current = state;

    const insertOps = [];
    for (let t = 0; t < 2; t++) {
      const trackId = toTrackId(`track-${t}`);
      const isVideo = t % 2 === 0;
      const assetId = isVideo ? 'asset-0' : 'asset-1';
      for (let c = 0; c < 100; c++) {
        const clip = createClip({
          id: `insert-t${t}-c${c}`,
          assetId,
          trackId,
          timelineStart: toFrame(600 + c * 300),
          timelineEnd: toFrame(600 + c * 300 + 100),
          mediaIn: toFrame(0),
          mediaOut: toFrame(100),
        });
        insertOps.push({ type: 'INSERT_CLIP' as const, clip, trackId });
      }
    }

    const tx1 = {
      id: 'insert-batch',
      label: 'Insert 200',
      timestamp: Date.now(),
      operations: insertOps,
    };
    const r1 = dispatch(current, tx1);
    if (!r1.accepted) throw new Error(r1.message);
    current = r1.nextState;
    const totalAfterInsert = current.timeline.tracks.reduce((n, tr) => n + tr.clips.length, 0);
    expect(totalAfterInsert).toBe(202);

    const removeOps = [];
    for (let t = 0; t < 2; t++) {
      const track = current.timeline.tracks[t]!;
      for (const clip of track.clips) {
        removeOps.push({ type: 'DELETE_CLIP' as const, clipId: clip.id });
      }
    }

    const tx2 = {
      id: 'remove-batch',
      label: 'Remove all',
      timestamp: Date.now(),
      operations: removeOps,
    };
    const r2 = dispatch(current, tx2);
    if (!r2.accepted) throw new Error(r2.message);
    current = r2.nextState;
    const totalAfterRemove = current.timeline.tracks.reduce((n, tr) => n + tr.clips.length, 0);
    expect(totalAfterRemove).toBe(0);
  });
});

// ── 5. Serialize/Deserialize Roundtrip ───────────────────────────────────────

describe('Load: Serialize/Deserialize Roundtrip', () => {
  it('roundtrip 10k clips in < 2s', () => {
    const t0 = Date.now();
    const json = serializeTimeline(sharedState10k);
    const restored = deserializeTimeline(json);
    const elapsed = Date.now() - t0;
    expect(restored.timeline.tracks.length).toBe(100);
    expect(elapsed).toBeLessThan(2000);
  });

  it('serialized JSON is valid and under 50MB', () => {
    const json = serializeTimeline(sharedState10k);
    const bytes = new TextEncoder().encode(json).length;
    expect(bytes).toBeLessThan(50 * 1024 * 1024);
    expect(JSON.parse(json)).toBeDefined();
  });
});

// ── 6. Snap Index Rebuild at Scale ───────────────────────────────────────────

describe('Load: Snap Index Rebuild at Scale', () => {
  it('buildSnapIndex on 10k clips × 500 rebuilds in < 2s', () => {
    const t0 = Date.now();
    for (let i = 0; i < 500; i++) {
      buildSnapIndex(sharedState10k, toFrame(i % 3000));
    }
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(2000);
  });

  it('SnapIndexManager debounces 5000 calls to 1 rebuild, < 50ms', async () => {
    const manager = new SnapIndexManager();
    const t0 = Date.now();
    for (let i = 0; i < 5000; i++) {
      manager.scheduleRebuild(sharedState10k);
    }
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(50);
    await Promise.resolve();
    expect(manager.getIndex()).not.toBeNull();
  });
});

// ── 7. TrackIndex Rebuild at Scale ───────────────────────────────────────────

describe('Load: TrackIndex Rebuild at Scale', () => {
  it('TrackIndex.build on 10k clips × 500 rebuilds in < 3s', () => {
    const t0 = Date.now();
    for (let i = 0; i < 500; i++) {
      const idx = new TrackIndex();
      idx.build(sharedState10k);
    }
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(3000);
  });

  it('TrackIndex.query 10k clips × 5000 queries in < 500ms', () => {
    const idx = new TrackIndex();
    idx.build(sharedState10k);
    const t0 = Date.now();
    for (let i = 0; i < 5000; i++) {
      getClipsAtFrame(sharedState10k, toFrame(i % 30000), idx);
    }
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(500);
  });
});

// ── 8. Memory Ceiling ────────────────────────────────────────────────────────

describe('Load: Memory Ceiling', () => {
  it('10k clips constructed without crash and memory < 50MB', { timeout: 30000 }, () => {
    const before = memMB();
    const state = buildScaleState({ numTracks: 100, clipsPerTrack: 100 });
    const after = memMB();
    const totalClips = state.timeline.tracks.reduce((n, tr) => n + tr.clips.length, 0);
    expect(totalClips).toBe(10000);
    if (before > 0 && after > 0) {
      expect(after - before).toBeLessThan(50);
    }
  });
});

// ── 9. Undo/Redo Burst ───────────────────────────────────────────────────────

describe('Load: Undo/Redo Burst', () => {
  it(
    '50 sequential edits + 100 undo/redo cursor moves on 1k clips in < 15s',
    { timeout: 30000 },
    () => {
      const state = buildScaleState({
        numTracks: 10,
        clipsPerTrack: 100,
        clipDuration: 100,
        timelineDuration: 50000,
      });
      let current = state;
      const history: TimelineState[] = [current];

      for (let i = 0; i < 50; i++) {
        const track = current.timeline.tracks[i % 10]!;
        const clip = track.clips[0];
        if (!clip) break;
        const result = dispatch(current, {
          id: `edit-${i}`,
          label: `Edit ${i}`,
          timestamp: Date.now(),
          operations: [
            {
              type: 'MOVE_CLIP',
              clipId: clip.id,
              newTimelineStart: toFrame(30000 + i * 400),
            },
          ],
        });
        if (!result.accepted) throw new Error(`Edit ${i} rejected: ${result.message}`);
        current = result.nextState;
        history.push(current);
      }

      const t0 = Date.now();
      let cursor = history.length - 1;
      for (let i = 0; i < 100; i++) {
        if (i % 2 === 0 && cursor > 0) {
          cursor--;
        } else if (cursor < history.length - 1) {
          cursor++;
        }
        const target = history[cursor]!;
        const track = target.timeline.tracks[i % 10]!;
        const clip = track.clips[0];
        if (clip) {
          const result = dispatch(target, {
            id: `undo-${i}`,
            label: `Undo ${i}`,
            timestamp: Date.now(),
            operations: [
              {
                type: 'MOVE_CLIP',
                clipId: clip.id,
                newTimelineStart: toFrame(40000 + i * 100),
              },
            ],
          });
          if (result.accepted) {
            current = result.nextState;
          }
        }
      }
      const elapsed = Date.now() - t0;
      expect(elapsed).toBeLessThan(15000);
    },
  );
});

// ── 10. Virtual Windowing at Scale ───────────────────────────────────────────

describe('Load: Virtual Windowing at Scale', () => {
  it('getClipsAtFrame on 1000 tracks × 10 clips stays fast (100 queries < 200ms)', () => {
    const state = buildScaleState({ numTracks: 1000, clipsPerTrack: 10 });
    const t0 = Date.now();
    for (let i = 0; i < 100; i++) {
      getClipsAtFrame(state, toFrame(i * 300));
    }
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(200);
  });

  it('TrackIndex on 1000 tracks × 10 clips × 1000 queries < 100ms', () => {
    const state = buildScaleState({ numTracks: 1000, clipsPerTrack: 10 });
    const idx = new TrackIndex();
    idx.build(state);
    const t0 = Date.now();
    for (let i = 0; i < 1000; i++) {
      getClipsAtFrame(state, toFrame(i % 3000), idx);
    }
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(100);
  });
});
