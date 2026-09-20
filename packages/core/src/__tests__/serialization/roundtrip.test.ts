/**
 * SERIALIZATION ROUND-TRIP TESTS
 *
 * For each format (JSON, OTIO, EDL, AAF, FCPXML):
 * - JSON and OTIO: full round-trip (serialize → deserialize → compare)
 * - EDL, AAF, FCPXML: export-only formats — test export produces valid output
 *   and that re-importing doesn't crash (where applicable)
 *
 * Important nuance: some formats (EDL especially) are inherently lossy.
 * For those, we test that the export produces valid output and document
 * what's lost.
 */

import { describe, it, expect } from 'vitest';
import { dispatch } from '../../engine/dispatcher';
import { checkInvariants } from '../../validation/invariants';
import { serializeTimeline, deserializeTimeline, remapAssetPaths } from '../../engine/serializer';
import { createTimelineState } from '../../types/state';
import { createTimeline } from '../../types/timeline';
import { createTrack, toTrackId } from '../../types/track';
import { createClip, toClipId } from '../../types/clip';
import { createAsset, createGeneratorAsset, toAssetId } from '../../types/asset';
import { toFrame, toTimecode } from '../../types/frame';
import { createTransition, toTransitionId } from '../../types/transition';
import { toMarkerId } from '../../types/marker';
import type { TimelineState } from '../../types/state';
import type { Transaction, OperationPrimitive } from '../../types/operations';

// ── Helpers ──────────────────────────────────────────────────────────────────

function applyTx(state: TimelineState, label: string, ops: OperationPrimitive[]): TimelineState {
  const tx: Transaction = {
    id: `tx-${Date.now()}-${Math.random()}`,
    label,
    timestamp: Date.now(),
    operations: ops,
  };
  const result = dispatch(state, tx);
  expect(result.accepted).toBe(true);
  if (!result.accepted) throw new Error(`Rejected: ${result.message}`);
  expect(checkInvariants(result.nextState)).toEqual([]);
  return result.nextState;
}

function buildComplexState(): TimelineState {
  const fps = 30;
  const duration = 5400;

  const timeline = createTimeline({
    id: 'rt',
    name: 'RoundTripTest',
    fps,
    duration: toFrame(duration),
    startTimecode: toTimecode('00:00:00:00'),
    tracks: [],
  });
  let state = createTimelineState({ timeline, assetRegistry: new Map() });

  // Tracks
  const v1 = toTrackId('v1');
  const v2 = toTrackId('v2');
  const a1 = toTrackId('a1');

  state = applyTx(state, 'Add tracks', [
    { type: 'ADD_TRACK', track: createTrack({ id: v1, name: 'V1', type: 'video', clips: [] }) },
    { type: 'ADD_TRACK', track: createTrack({ id: v2, name: 'V2', type: 'video', clips: [] }) },
    { type: 'ADD_TRACK', track: createTrack({ id: a1, name: 'A1', type: 'audio', clips: [] }) },
  ]);

  // Assets
  const vidAsset = createAsset({
    id: 'vid-asset',
    name: 'clip-a',
    mediaType: 'video',
    filePath: '/media/clip-a.mp4',
    intrinsicDuration: toFrame(10000),
    nativeFps: fps,
    sourceTimecodeOffset: toFrame(0),
  });
  const audAsset = createAsset({
    id: 'aud-asset',
    name: 'clip-audio',
    mediaType: 'audio',
    filePath: '/media/clip-a.wav',
    intrinsicDuration: toFrame(10000),
    nativeFps: fps,
    sourceTimecodeOffset: toFrame(0),
  });
  const genAsset = createGeneratorAsset({
    id: 'gen-asset',
    name: 'Solid',
    mediaType: 'video',
    generatorDef: {
      id: 'gen-1' as any,
      type: 'solid',
      params: { color: '#fff' },
      duration: toFrame(10000),
      name: 'Solid',
    },
    nativeFps: fps,
  });

  state = applyTx(state, 'Register assets', [
    { type: 'REGISTER_ASSET', asset: vidAsset },
    { type: 'REGISTER_ASSET', asset: audAsset },
    { type: 'REGISTER_ASSET', asset: genAsset },
  ]);

  // Clips
  const c1 = createClip({
    id: 'c1',
    assetId: 'vid-asset',
    trackId: v1,
    timelineStart: toFrame(0),
    timelineEnd: toFrame(900),
    mediaIn: toFrame(0),
    mediaOut: toFrame(900),
  });
  const c2 = createClip({
    id: 'c2',
    assetId: 'vid-asset',
    trackId: v1,
    timelineStart: toFrame(1000),
    timelineEnd: toFrame(1900),
    mediaIn: toFrame(0),
    mediaOut: toFrame(900),
  });
  const c3 = createClip({
    id: 'c3',
    assetId: 'gen-asset',
    trackId: v2,
    timelineStart: toFrame(0),
    timelineEnd: toFrame(900),
    mediaIn: toFrame(0),
    mediaOut: toFrame(900),
  });
  const c4 = createClip({
    id: 'c4',
    assetId: 'aud-asset',
    trackId: a1,
    timelineStart: toFrame(0),
    timelineEnd: toFrame(900),
    mediaIn: toFrame(0),
    mediaOut: toFrame(900),
  });

  state = applyTx(state, 'Insert clips', [
    { type: 'INSERT_CLIP', clip: c1, trackId: v1 },
    { type: 'INSERT_CLIP', clip: c2, trackId: v1 },
    { type: 'INSERT_CLIP', clip: c3, trackId: v2 },
    { type: 'INSERT_CLIP', clip: c4, trackId: a1 },
  ]);

  // Metadata on c1
  state = applyTx(state, 'Set metadata', [
    {
      type: 'SET_CLIP_METADATA',
      clipId: toClipId('c1'),
      metadata: { testKey: 'testVal' },
    },
  ]);

  // Transition on c1
  state = applyTx(state, 'Add transition', [
    {
      type: 'ADD_TRANSITION',
      clipId: toClipId('c1'),
      transition: createTransition(toTransitionId('tr1'), 'dissolve', 15, 'centerOnCut', 'linear'),
    },
  ]);

  // Markers
  state = applyTx(state, 'Add markers', [
    {
      type: 'ADD_MARKER',
      marker: {
        type: 'point',
        id: toMarkerId('m1'),
        frame: toFrame(900),
        label: 'Scene 2',
        color: 'red',
        scope: 'global',
        linkedClipId: null,
      },
    },
    {
      type: 'ADD_MARKER',
      marker: {
        type: 'range',
        id: toMarkerId('m2'),
        frameStart: toFrame(1000),
        frameEnd: toFrame(1900),
        label: 'Act 1',
        color: 'blue',
        scope: 'global',
        linkedClipId: null,
      },
    },
  ]);

  return state;
}

// ── JSON round-trip ──────────────────────────────────────────────────────────

describe('Serialization: JSON round-trip', () => {
  it('serialize → deserialize produces 0 invariant violations', () => {
    const state = buildComplexState();
    const round = deserializeTimeline(serializeTimeline(state));
    expect(checkInvariants(round)).toEqual([]);
  });

  it('clip count preserved (4 clips)', () => {
    const state = buildComplexState();
    const round = deserializeTimeline(serializeTimeline(state));
    const totalClips = round.timeline.tracks.reduce((acc, t) => acc + t.clips.length, 0);
    expect(totalClips).toBe(4);
  });

  it('track count preserved (3 tracks)', () => {
    const state = buildComplexState();
    const round = deserializeTimeline(serializeTimeline(state));
    expect(round.timeline.tracks).toHaveLength(3);
  });

  it('marker count preserved (2 markers)', () => {
    const state = buildComplexState();
    const round = deserializeTimeline(serializeTimeline(state));
    expect(round.timeline.markers).toHaveLength(2);
  });

  it('clip metadata preserved', () => {
    const state = buildComplexState();
    const round = deserializeTimeline(serializeTimeline(state));
    const c1 = round.timeline.tracks.flatMap((t) => t.clips).find((c) => c.id === 'c1')!;
    expect(c1.metadata).toBeDefined();
    expect(c1.metadata!.testKey).toBe('testVal');
  });

  it('transition preserved', () => {
    const state = buildComplexState();
    const round = deserializeTimeline(serializeTimeline(state));
    const c1 = round.timeline.tracks.flatMap((t) => t.clips).find((c) => c.id === 'c1')!;
    expect(c1.transition).toBeDefined();
    expect(c1.transition!.type).toBe('dissolve');
    expect(c1.transition!.durationFrames).toBe(15);
  });

  it('clip durations preserved exactly', () => {
    const state = buildComplexState();
    const round = deserializeTimeline(serializeTimeline(state));
    const c1 = round.timeline.tracks.flatMap((t) => t.clips).find((c) => c.id === 'c1')!;
    expect((c1.timelineEnd - c1.timelineStart) as number).toBe(900);
  });

  it('idempotent: serialize → deserialize → serialize produces identical JSON', () => {
    const state = buildComplexState();
    const s1 = serializeTimeline(state);
    const s2 = serializeTimeline(deserializeTimeline(s1));
    expect(s2).toBe(s1);
  });

  it('empty state round-trips correctly', () => {
    const timeline = createTimeline({
      id: 'empty',
      name: 'Empty',
      fps: 30,
      duration: toFrame(1000),
      startTimecode: toTimecode('00:00:00:00'),
      tracks: [],
    });
    const state = createTimelineState({ timeline });
    const round = deserializeTimeline(serializeTimeline(state));
    expect(checkInvariants(round)).toEqual([]);
    expect(round.timeline.tracks).toHaveLength(0);
  });

  it('state with generator asset round-trips correctly', () => {
    const state = buildComplexState();
    const round = deserializeTimeline(serializeTimeline(state));
    const genAsset = round.assetRegistry.get('gen-asset' as any);
    expect(genAsset).toBeDefined();
    expect(genAsset!.kind).toBe('generator');
  });
});

// ── Asset remapping ──────────────────────────────────────────────────────────

describe('Serialization: remapAssetPaths', () => {
  it('remapAssetPaths replaces all FileAsset paths', () => {
    const state = buildComplexState();
    const remapped = remapAssetPaths(state, (a) => ({ ...a, filePath: `/rel${a.filePath}` }));
    const values = Array.from(remapped.assetRegistry.values());
    const paths = values.filter((a) => a.kind === 'file').map((a) => (a as any).filePath);
    expect(paths).toContain('/rel/media/clip-a.mp4');
    expect(paths).toContain('/rel/media/clip-a.wav');
    expect(checkInvariants(remapped)).toEqual([]);
  });

  it('GeneratorAsset unchanged after remap', () => {
    const state = buildComplexState();
    const remapped = remapAssetPaths(state, (a) => ({ ...a, filePath: `/rel${a.filePath}` }));
    const gen = remapped.assetRegistry.get('gen-asset' as any)!;
    expect(gen.kind).toBe('generator');
  });
});
