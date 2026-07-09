/**
 * Phase R Step 2 — Full hook set
 *
 * All hooks take engine: TimelineEngine as first arg and use useSyncExternalStore
 * with a pure selector. Referential stability of the returned value controls re-renders.
 */

import { useSyncExternalStore, useRef } from 'react';
import type { TimelineEngine } from '../engine';
import type { EngineSnapshot } from '../types/engine-snapshot';
import type { Timeline, Track, Clip } from '@timelinx/core';
import type { TrackId, ClipId } from '@timelinx/core';
import type { TimelineFrame, ProvisionalState, StateChange } from '@timelinx/core';
import type { Effect } from '@timelinx/core';
import type { Transition } from '@timelinx/core';
import type { Caption } from '@timelinx/core';

type Marker = Timeline['markers'][number];

const EMPTY_CLIPS: readonly Clip[] = [];
const EMPTY_MARKERS: readonly Marker[] = [];
const EMPTY_EFFECTS: readonly Effect[] = [];
const EMPTY_CAPTIONS: readonly Caption[] = [];
const EMPTY_TRANSITIONS: readonly { clipId: string; trackId: string; transition: Transition }[] = [];

function getServerSnapshot<T>(engine: TimelineEngine, selector: (snap: EngineSnapshot) => T): T {
  return selector(engine.getSnapshot());
}

// ---------------------------------------------------------------------------
// useTimeline
// ---------------------------------------------------------------------------

export function useTimeline(engine: TimelineEngine): Timeline {
  return useSyncExternalStore(
    engine.subscribe,
    () => engine.getSnapshot().state.timeline,
    () => getServerSnapshot(engine, (snap) => snap.state.timeline),
  );
}

// ---------------------------------------------------------------------------
// useTrackIds
// ---------------------------------------------------------------------------

export function useTrackIds(engine: TimelineEngine): readonly string[] {
  return useSyncExternalStore(
    engine.subscribe,
    () => engine.getSnapshot().trackIds,
    () => getServerSnapshot(engine, (snap) => snap.trackIds),
  );
}

// ---------------------------------------------------------------------------
// useTrack
// ---------------------------------------------------------------------------

export function useTrack(engine: TimelineEngine, trackId: TrackId | string): Track | null {
  const id = typeof trackId === 'string' ? trackId : (trackId as string);
  return useSyncExternalStore(
    engine.subscribe,
    () => engine.getSnapshot().state.timeline.tracks.find((t) => t.id === id) ?? null,
    () =>
      getServerSnapshot(
        engine,
        (snap) => snap.state.timeline.tracks.find((t) => t.id === id) ?? null,
      ),
  );
}

// ---------------------------------------------------------------------------
// useClip — provisional-aware; isolation: clip A change does not re-render clip B
// ---------------------------------------------------------------------------

export function useClip(engine: TimelineEngine, clipId: ClipId | string): Clip | null {
  const id = typeof clipId === 'string' ? clipId : (clipId as string);
  const tracks = useAllTracks(engine);
  if (!id) return null;
  for (const track of tracks) {
    const clip = track.clips.find((c) => c.id === id);
    if (clip) return clip;
  }
  return null;
}

// ---------------------------------------------------------------------------
// useClips
// ---------------------------------------------------------------------------

export function useClips(
  engine: TimelineEngine,
  trackId: TrackId | string,
): readonly Clip[] {
  const id = typeof trackId === 'string' ? trackId : (trackId as string);
  return useSyncExternalStore(
    engine.subscribe,
    () =>
      engine.getSnapshot().state.timeline.tracks.find((t) => t.id === id)?.clips ?? EMPTY_CLIPS,
    () =>
      getServerSnapshot(
        engine,
        (snap) => snap.state.timeline.tracks.find((t) => t.id === id)?.clips ?? EMPTY_CLIPS,
      ),
  );
}

// ---------------------------------------------------------------------------
// useMarkers
// ---------------------------------------------------------------------------

export function useMarkers(engine: TimelineEngine): readonly Marker[] {
  return useSyncExternalStore(
    engine.subscribe,
    () => engine.getSnapshot().state.timeline.markers ?? EMPTY_MARKERS,
    () =>
      getServerSnapshot(
        engine,
        (snap) => snap.state.timeline.markers ?? EMPTY_MARKERS,
      ),
  );
}

// ---------------------------------------------------------------------------
// useHistory — stable object ref when canUndo/canRedo unchanged
// ---------------------------------------------------------------------------

export function useHistory(engine: TimelineEngine): {
  canUndo: boolean;
  canRedo: boolean;
} {
  return useSyncExternalStore(
    engine.subscribe,
    () => engine.getSnapshot().history,
    () => getServerSnapshot(engine, (snap) => snap.history),
  );
}

// ---------------------------------------------------------------------------
// useActiveToolId
// ---------------------------------------------------------------------------

export function useActiveToolId(engine: TimelineEngine): string {
  return useSyncExternalStore(
    engine.subscribe,
    () => engine.getSnapshot().activeToolId,
    () => getServerSnapshot(engine, (snap) => snap.activeToolId),
  );
}

// ---------------------------------------------------------------------------
// useCursor
// ---------------------------------------------------------------------------

export function useCursor(engine: TimelineEngine): string {
  return useSyncExternalStore(
    engine.subscribe,
    () => engine.getSnapshot().cursor,
    () => getServerSnapshot(engine, (snap) => snap.cursor),
  );
}

// ---------------------------------------------------------------------------
// useProvisional
// ---------------------------------------------------------------------------

export function useProvisional(engine: TimelineEngine): ProvisionalState | null {
  return useSyncExternalStore(
    engine.subscribe,
    () => engine.getSnapshot().provisional,
    () => getServerSnapshot(engine, (snap) => snap.provisional),
  );
}

// ---------------------------------------------------------------------------
// usePlayheadFrame — re-renders every frame during playback
// ---------------------------------------------------------------------------

export function usePlayheadFrame(engine: TimelineEngine): TimelineFrame {
  return useSyncExternalStore(
    engine.subscribe,
    () => engine.getSnapshot().playhead.currentFrame,
    () => getServerSnapshot(engine, (snap) => snap.playhead.currentFrame),
  );
}

// ---------------------------------------------------------------------------
// useIsPlaying
// ---------------------------------------------------------------------------

export function useIsPlaying(engine: TimelineEngine): boolean {
  return useSyncExternalStore(
    engine.subscribe,
    () => engine.getSnapshot().playhead.isPlaying,
    () => getServerSnapshot(engine, (snap) => snap.playhead.isPlaying),
  );
}

// ---------------------------------------------------------------------------
// useChange — advanced: subscribe to diff for custom bailout
// ---------------------------------------------------------------------------

export function useChange(engine: TimelineEngine): StateChange {
  return useSyncExternalStore(
    engine.subscribe,
    () => engine.getSnapshot().change,
    () => getServerSnapshot(engine, (snap) => snap.change),
  );
}

// ---------------------------------------------------------------------------
// usePlaybackEngine
// ---------------------------------------------------------------------------

import type { PlaybackEngine } from '@timelinx/core';

export function usePlaybackEngine(engine: TimelineEngine): PlaybackEngine | null {
  return engine.playbackEngine;
}

// ---------------------------------------------------------------------------
// useSelectedClipIds — re-renders when selection changes
// ---------------------------------------------------------------------------

const EMPTY_SELECTION: ReadonlySet<string> = new Set();

export function useSelectedClipIds(engine: TimelineEngine): ReadonlySet<string> {
  return useSyncExternalStore(
    engine.subscribe,
    () => engine.getSnapshot().selectedClipIds ?? EMPTY_SELECTION,
    () => getServerSnapshot(engine, (snap) => snap.selectedClipIds ?? EMPTY_SELECTION),
  );
}

// ---------------------------------------------------------------------------
// useAllTracks — returns all tracks reactively
// ---------------------------------------------------------------------------

export function useAllTracks(engine: TimelineEngine): readonly Track[] {
  return useSyncExternalStore(
    engine.subscribe,
    () => engine.getSnapshot().state.timeline.tracks,
    () => getServerSnapshot(engine, (snap) => snap.state.timeline.tracks),
  );
}

// ---------------------------------------------------------------------------
// useFps — returns timeline FPS reactively
// ---------------------------------------------------------------------------

export function useFps(engine: TimelineEngine): number {
  return useSyncExternalStore(
    engine.subscribe,
    () => Number(engine.getSnapshot().state.timeline.fps) || 30,
    () => getServerSnapshot(engine, (snap) => Number(snap.state.timeline.fps) || 30),
  );
}

// ---------------------------------------------------------------------------
// useClipEffects — returns effects for a specific clip reactively
// ---------------------------------------------------------------------------

export function useClipEffects(engine: TimelineEngine, clipId: ClipId | string): readonly Effect[] {
  const id = typeof clipId === 'string' ? clipId : (clipId as string);
  const tracks = useAllTracks(engine);
  if (!id) return EMPTY_EFFECTS;
  for (const track of tracks) {
    const clip = track.clips.find((c) => c.id === id);
    if (clip) return clip.effects ?? EMPTY_EFFECTS;
  }
  return EMPTY_EFFECTS;
}

// ---------------------------------------------------------------------------
// useClipTransition — returns transition for a specific clip reactively
// ---------------------------------------------------------------------------

export function useClipTransition(engine: TimelineEngine, clipId: ClipId | string): Transition | null {
  const id = typeof clipId === 'string' ? clipId : (clipId as string);
  const tracks = useAllTracks(engine);
  if (!id) return null;
  for (const track of tracks) {
    const clip = track.clips.find((c) => c.id === id);
    if (clip) return clip.transition ?? null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// useTrackCaptions — returns captions for a specific track reactively
// ---------------------------------------------------------------------------

export function useTrackCaptions(engine: TimelineEngine, trackId: TrackId | string): readonly Caption[] {
  const id = typeof trackId === 'string' ? trackId : (trackId as string);
  const tracks = useAllTracks(engine);
  if (!id) return EMPTY_CAPTIONS;
  const track = tracks.find((t) => t.id === id);
  return track?.captions ?? EMPTY_CAPTIONS;
}

// ---------------------------------------------------------------------------
// useAllTransitions — returns all clips with transitions reactively
// ---------------------------------------------------------------------------

type TransitionEntry = { clipId: string; trackId: string; transition: Transition };

function collectTransitions(snap: EngineSnapshot): readonly TransitionEntry[] {
  const result: TransitionEntry[] = [];
  for (const track of snap.state.timeline.tracks) {
    for (const clip of track.clips) {
      if (clip.transition) {
        result.push({
          clipId: clip.id,
          trackId: track.id,
          transition: clip.transition,
        });
      }
    }
  }
  return result;
}

function transitionsEqual(a: readonly TransitionEntry[], b: readonly TransitionEntry[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].clipId !== b[i].clipId || a[i].transition !== b[i].transition) return false;
  }
  return true;
}

export function useAllTransitions(engine: TimelineEngine): readonly TransitionEntry[] {
  const prevRef = useRef<readonly TransitionEntry[]>(EMPTY_TRANSITIONS);
  return useSyncExternalStore(
    engine.subscribe,
    () => {
      const next = collectTransitions(engine.getSnapshot());
      if (transitionsEqual(prevRef.current, next)) return prevRef.current;
      prevRef.current = next;
      return next;
    },
    () => {
      const next = collectTransitions(engine.getSnapshot());
      if (transitionsEqual(prevRef.current, next)) return prevRef.current;
      prevRef.current = next;
      return next;
    },
  );
}
