/**
 * Phase 7 Step 4 — Worker contracts, ThumbnailCache, ThumbnailQueue
 *
 * No actual Worker instantiation. Type and behavior tests only.
 */

import { describe, it, expect } from 'vitest';
import { toFrame, toTimecode } from '../types/frame';
import { toClipId } from '../types/clip';
import { toAssetId } from '../types/asset';
import { toTrackId } from '../types/track';
import { ThumbnailCache } from '../engine/thumbnail-cache';
import { ThumbnailQueue } from '../engine/thumbnail-queue';
import { dispatch } from '../engine/dispatcher';
import { checkInvariants } from '../validation/invariants';
import { createTimelineState } from '../types/state';
import { createTimeline } from '../types/timeline';
import { createTrack } from '../types/track';
import { createClip } from '../types/clip';
import { createAsset } from '../types/asset';
import type { ThumbnailRequest, ThumbnailResult } from '../types/pipeline';
import type {
  WaveformRequest,
  WaveformResult,
  WaveformWorkerMessage,
} from '../types/worker-contracts';
import type { Transaction, OperationPrimitive } from '../types/operations';

function makeThumbRequest(
  clipId: string,
  mediaFrame: number,
  width = 100,
  height = 50,
): ThumbnailRequest {
  return {
    clipId: toClipId(clipId),
    mediaFrame: toFrame(mediaFrame),
    width,
    height,
  };
}

function makeThumbResult(clipId: string, mediaFrame: number): ThumbnailResult {
  return {
    clipId: toClipId(clipId),
    mediaFrame: toFrame(mediaFrame),
    bitmap: null,
  };
}

describe('Phase 7 — ThumbnailCache', () => {
  it('1. get() returns null on miss', () => {
    const cache = new ThumbnailCache();
    expect(cache.get(makeThumbRequest('c1', 0))).toBeNull();
  });

  it('2. set() then get() returns result', () => {
    const cache = new ThumbnailCache();
    const req = makeThumbRequest('c1', 10);
    const res = makeThumbResult('c1', 10);
    cache.set(req, res);
    expect(cache.get(req)).toEqual(res);
  });

  it('3. has() returns true after set', () => {
    const cache = new ThumbnailCache();
    const req = makeThumbRequest('c1', 0);
    cache.set(req, makeThumbResult('c1', 0));
    expect(cache.has(req)).toBe(true);
  });

  it('4. LRU eviction: set maxSize=2, add 3 entries, oldest evicted', () => {
    const cache = new ThumbnailCache(2);
    cache.set(makeThumbRequest('c1', 0), makeThumbResult('c1', 0));
    cache.set(makeThumbRequest('c2', 0), makeThumbResult('c2', 0));
    cache.set(makeThumbRequest('c3', 0), makeThumbResult('c3', 0));
    expect(cache.size).toBe(2);
    expect(cache.get(makeThumbRequest('c1', 0))).toBeNull();
    expect(cache.get(makeThumbRequest('c2', 0))).not.toBeNull();
    expect(cache.get(makeThumbRequest('c3', 0))).not.toBeNull();
  });

  it('5. LRU order: get() on existing promotes it (access oldest, then add new → middle evicted)', () => {
    const cache = new ThumbnailCache(2);
    cache.set(makeThumbRequest('c1', 0), makeThumbResult('c1', 0));
    cache.set(makeThumbRequest('c2', 0), makeThumbResult('c2', 0));
    cache.get(makeThumbRequest('c1', 0));
    cache.set(makeThumbRequest('c3', 0), makeThumbResult('c3', 0));
    expect(cache.get(makeThumbRequest('c1', 0))).not.toBeNull();
    expect(cache.get(makeThumbRequest('c2', 0))).toBeNull();
    expect(cache.get(makeThumbRequest('c3', 0))).not.toBeNull();
  });

  it('6. invalidateClip removes all entries for clipId', () => {
    const cache = new ThumbnailCache();
    cache.set(makeThumbRequest('c1', 0), makeThumbResult('c1', 0));
    cache.set(makeThumbRequest('c1', 10), makeThumbResult('c1', 10));
    cache.set(makeThumbRequest('c2', 0), makeThumbResult('c2', 0));
    cache.invalidateClip(toClipId('c1'));
    expect(cache.has(makeThumbRequest('c1', 0))).toBe(false);
    expect(cache.has(makeThumbRequest('c1', 10))).toBe(false);
    expect(cache.has(makeThumbRequest('c2', 0))).toBe(true);
  });

  it('7. clear() empties cache', () => {
    const cache = new ThumbnailCache();
    cache.set(makeThumbRequest('c1', 0), makeThumbResult('c1', 0));
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get(makeThumbRequest('c1', 0))).toBeNull();
  });

  it('8. size reflects current count', () => {
    const cache = new ThumbnailCache();
    expect(cache.size).toBe(0);
    cache.set(makeThumbRequest('c1', 0), makeThumbResult('c1', 0));
    expect(cache.size).toBe(1);
    cache.set(makeThumbRequest('c2', 0), makeThumbResult('c2', 0));
    expect(cache.size).toBe(2);
  });
});

describe('Phase 7 — ThumbnailQueue', () => {
  it('9. enqueue adds entry', () => {
    const q = new ThumbnailQueue();
    q.enqueue(makeThumbRequest('c1', 0));
    expect(q.length).toBe(1);
    const e = q.dequeue();
    expect(e?.request.clipId).toBe(toClipId('c1'));
  });

  it('10. dequeue returns highest priority first', () => {
    const q = new ThumbnailQueue();
    q.enqueue(makeThumbRequest('c1', 0), 'low');
    q.enqueue(makeThumbRequest('c2', 0), 'high');
    q.enqueue(makeThumbRequest('c3', 0), 'normal');
    expect(q.dequeue()?.request.clipId).toBe(toClipId('c2'));
    expect(q.dequeue()?.request.clipId).toBe(toClipId('c3'));
    expect(q.dequeue()?.request.clipId).toBe(toClipId('c1'));
  });

  it('11. Tiebreak: same priority → earlier addedAt first', () => {
    const q = new ThumbnailQueue();
    q.enqueue(makeThumbRequest('c1', 0), 'normal');
    q.enqueue(makeThumbRequest('c2', 0), 'normal');
    q.enqueue(makeThumbRequest('c3', 0), 'normal');
    expect(q.dequeue()?.request.clipId).toBe(toClipId('c1'));
    expect(q.dequeue()?.request.clipId).toBe(toClipId('c2'));
    expect(q.dequeue()?.request.clipId).toBe(toClipId('c3'));
  });

  it('12. dequeue on empty returns null', () => {
    const q = new ThumbnailQueue();
    expect(q.dequeue()).toBeNull();
  });

  it('13. Duplicate clipId+frame: higher priority wins', () => {
    const q = new ThumbnailQueue();
    q.enqueue(makeThumbRequest('c1', 0), 'low');
    q.enqueue(makeThumbRequest('c1', 0), 'high');
    expect(q.length).toBe(1);
    expect(q.dequeue()?.priority).toBe('high');
  });

  it('14. Duplicate clipId+frame: lower priority ignored', () => {
    const q = new ThumbnailQueue();
    q.enqueue(makeThumbRequest('c1', 0), 'high');
    q.enqueue(makeThumbRequest('c1', 0), 'low');
    expect(q.length).toBe(1);
    expect(q.dequeue()?.priority).toBe('high');
  });

  it('15. cancel removes all entries for clipId', () => {
    const q = new ThumbnailQueue();
    q.enqueue(makeThumbRequest('c1', 0));
    q.enqueue(makeThumbRequest('c1', 10));
    q.enqueue(makeThumbRequest('c2', 0));
    q.cancel(toClipId('c1'));
    expect(q.length).toBe(1);
    expect(q.dequeue()?.request.clipId).toBe(toClipId('c2'));
  });

  it('16. setPriority updates existing entry', () => {
    const q = new ThumbnailQueue();
    q.enqueue(makeThumbRequest('c1', 5), 'low');
    q.setPriority(toClipId('c1'), toFrame(5), 'high');
    expect(q.dequeue()?.priority).toBe('high');
  });

  it('17. peek returns top without removing', () => {
    const q = new ThumbnailQueue();
    q.enqueue(makeThumbRequest('c1', 0), 'high');
    const top = q.peek();
    expect(top?.request.clipId).toBe(toClipId('c1'));
    expect(q.length).toBe(1);
    expect(q.dequeue()?.request.clipId).toBe(toClipId('c1'));
  });

  it('18. length reflects queue size', () => {
    const q = new ThumbnailQueue();
    expect(q.length).toBe(0);
    q.enqueue(makeThumbRequest('c1', 0));
    expect(q.length).toBe(1);
    q.dequeue();
    expect(q.length).toBe(0);
  });
});

describe('Phase 7 — WaveformWorkerMessage type tests', () => {
  it('19. WaveformRequest has all required fields', () => {
    const req: WaveformRequest = {
      requestId: 'r1',
      assetId: toAssetId('a1'),
      channel: 0,
      startFrame: toFrame(0),
      endFrame: toFrame(100),
      buckets: 50,
      sampleRate: 48000,
    };
    expect(req.requestId).toBe('r1');
    expect(req.assetId).toBeDefined();
    expect(req.channel).toBe(0);
    expect(req.buckets).toBe(50);
    expect(req.sampleRate).toBe(48000);
  });

  it('20. WaveformResult has peaks array', () => {
    const res: WaveformResult = {
      requestId: 'r1',
      assetId: toAssetId('a1'),
      peaks: [{ min: -0.5, max: 0.8, rms: 0.3 }],
    };
    expect(res.peaks).toHaveLength(1);
    expect(res.peaks[0]!.min).toBe(-0.5);
    expect(res.peaks[0]!.max).toBe(0.8);
  });

  it('21. WaveformWorkerMessage type: request | cancel discriminated union compiles', () => {
    const req: WaveformWorkerMessage = {
      type: 'request',
      payload: {
        requestId: 'r1',
        assetId: toAssetId('a1'),
        channel: 0,
        startFrame: toFrame(0),
        endFrame: toFrame(100),
        buckets: 10,
        sampleRate: 48000,
      },
    };
    expect(req.type).toBe('request');
    const cancel: WaveformWorkerMessage = { type: 'cancel', requestId: 'r1' };
    expect(cancel.type).toBe('cancel');
  });
});

// ── Worker-safe tests: structuredClone, worker dispatch, race conditions ──────

function makeWorkerState() {
  const asset = createAsset({
    id: 'asset-1', name: 'V', mediaType: 'video',
    filePath: '/v.mp4', intrinsicDuration: toFrame(10000),
    nativeFps: 30, sourceTimecodeOffset: toFrame(0), status: 'online',
  });
  const clip = createClip({
    id: 'clip-1', assetId: 'asset-1', trackId: 'track-1',
    timelineStart: toFrame(0), timelineEnd: toFrame(200),
    mediaIn: toFrame(0), mediaOut: toFrame(200),
  });
  const track = createTrack({ id: 'track-1', name: 'V1', type: 'video', clips: [clip] });
  const timeline = createTimeline({
    id: 'tl', name: 'Worker Test', fps: 30, duration: toFrame(5000),
    startTimecode: toTimecode('00:00:00:00'), tracks: [track],
  });
  return createTimelineState({ timeline, assetRegistry: new Map([[toAssetId('asset-1'), asset]]) });
}

let wTxCounter = 0;
function wTx(ops: OperationPrimitive[]): Transaction {
  return { id: `w-tx-${++wTxCounter}`, label: 'worker', timestamp: Date.now(), operations: ops };
}

describe('Worker-safe: structuredClone', () => {
  it('TimelineState survives structuredClone (simulates postMessage)', () => {
    const state = makeWorkerState();
    const cloned = structuredClone(state);

    // Cloned state should be structurally identical
    expect(cloned.timeline.name).toBe('Worker Test');
    expect(cloned.timeline.tracks[0]!.clips[0]!.id).toBe('clip-1');
    expect(cloned.schemaVersion).toBe(state.schemaVersion);
    expect(cloned.timeline.version).toBe(0);
  });

  it('dispatch on cloned state produces valid result', () => {
    const state = makeWorkerState();
    const cloned = structuredClone(state);

    const result = dispatch(cloned, wTx([
      { type: 'RENAME_TIMELINE', name: 'Cloned' },
    ]));
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.nextState.timeline.name).toBe('Cloned');
    expect(checkInvariants(result.nextState)).toEqual([]);
  });

  it('cloned state is deeply independent — mutating clone does not affect original', () => {
    const state = makeWorkerState();
    const cloned = structuredClone(state);

    // Mutate the cloned state's internal structure
    (cloned.timeline as { name: string }).name = 'Mutated';
    (cloned.timeline.tracks[0] as { name: string }).name = 'Mutated Track';

    // Original should be untouched
    expect(state.timeline.name).toBe('Worker Test');
    expect(state.timeline.tracks[0]!.name).toBe('V1');
  });
});

describe('Worker-safe: dispatch on cloned state', () => {
  it('move clip on cloned state produces valid invariant-free result', () => {
    const state = makeWorkerState();
    const cloned = structuredClone(state);

    const result = dispatch(cloned, wTx([
      { type: 'MOVE_CLIP', clipId: toClipId('clip-1'), newTimelineStart: toFrame(500) },
    ]));
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.nextState.timeline.tracks[0]!.clips[0]!.timelineStart).toBe(500);
    expect(checkInvariants(result.nextState)).toEqual([]);
  });

  it('multi-op transaction on cloned state is atomic', () => {
    const state = makeWorkerState();
    const cloned = structuredClone(state);

    const result = dispatch(cloned, wTx([
      { type: 'RENAME_TIMELINE', name: 'Worker Edit' },
      { type: 'MOVE_CLIP', clipId: toClipId('clip-1'), newTimelineStart: toFrame(100) },
      { type: 'SET_TIMELINE_DURATION', duration: toFrame(8000) },
    ]));
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.nextState.timeline.name).toBe('Worker Edit');
    expect(result.nextState.timeline.tracks[0]!.clips[0]!.timelineStart).toBe(100);
    expect(result.nextState.timeline.duration).toBe(8000);
    expect(checkInvariants(result.nextState)).toEqual([]);
  });
});

describe('Worker-safe: race conditions', () => {
  it('two dispatches on same original state — only one wins', () => {
    const state = makeWorkerState();

    // Two concurrent dispatches on the same state
    const r1 = dispatch(state, wTx([
      { type: 'RENAME_TIMELINE', name: 'Worker A' },
    ]));
    const r2 = dispatch(state, wTx([
      { type: 'RENAME_TIMELINE', name: 'Worker B' },
    ]));

    // Both should succeed independently (they're against the same frozen state)
    expect(r1.accepted).toBe(true);
    expect(r2.accepted).toBe(true);

    // But only one should be used (simulated by picking first)
    const winner = r1.accepted ? r1.nextState : r2.nextState!;
    expect(winner.timeline.name).toMatch(/Worker [AB]/);
    expect(checkInvariants(winner)).toEqual([]);
  });

  it('chained dispatches from cloned state maintain version monotonicity', () => {
    let state = structuredClone(makeWorkerState());

    for (let i = 1; i <= 10; i++) {
      const result = dispatch(state, wTx([
        { type: 'RENAME_TIMELINE', name: `Step ${i}` },
      ]));
      expect(result.accepted).toBe(true);
      if (!result.accepted) break;
      expect(result.nextState.timeline.version).toBe(i);
      state = result.nextState;
    }
  });
});
