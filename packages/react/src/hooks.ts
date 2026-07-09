/**
 * @timelinx/react — hooks
 *
 * Phase R Step 2: All hooks use useSyncExternalStore. Engine-as-first-arg hooks
 * live in hooks/index.ts. This file provides useEngine() from context and
 * context-based wrappers so existing code (useTimeline(), useTrackIds(), etc.)
 * continues to work without passing engine.
 */

import { useContext, useMemo } from 'react';
import { TimelineContext } from './TimelineProvider';
import type { TimelineEngine } from './engine';
import type { TrackId, ClipId, ProvisionalState } from '@timelinx/core';

// Re-export + import all engine-as-first-arg hooks from hooks/index
import {
  useTimeline as useTimelineEngine,
  useTrackIds as useTrackIdsEngine,
  useTrack as useTrackEngine,
  useClip as useClipEngine,
  useClips,
  useMarkers,
  useHistory,
  useActiveToolId,
  useCursor,
  useProvisional as useProvisionalEngine,
  usePlayheadFrame,
  useIsPlaying,
  useChange,
  usePlaybackEngine,
  useSelectedClipIds,
  useAllTracks,
  useFps,
  useClipEffects,
  useClipTransition,
  useTrackCaptions,
  useAllTransitions,
} from './hooks/index';

export {
  useTimelineEngine as useTimelineWithEngine,
  useTrackIdsEngine as useTrackIdsWithEngine,
  useTrackEngine as useTrackWithEngine,
  useClipEngine as useClipWithEngine,
  useClips,
  useMarkers,
  useHistory,
  useActiveToolId,
  useCursor,
  useProvisionalEngine as useProvisionalWithEngine,
  usePlayheadFrame,
  useIsPlaying,
  useChange,
  usePlaybackEngine,
  useSelectedClipIds,
  useAllTracks,
  useFps,
  useClipEffects,
  useClipTransition,
  useTrackCaptions,
  useAllTransitions,
};

// ---------------------------------------------------------------------------
// useEngine — from context (no subscription)
// ---------------------------------------------------------------------------

function useTimelineContext(): TimelineEngine {
  const engine = useContext(TimelineContext);
  if (!engine) {
    throw new Error(
      'Timeline hooks must be used within a <TimelineProvider>. ' +
        'Wrap your component tree with <TimelineProvider engine={engine}>.',
    );
  }
  return engine;
}

/**
 * Returns the TimelineEngine instance from context.
 * Use with Phase R hooks: useTimeline(useEngine()), etc.
 *
 * @throws If used outside TimelineProvider.
 */
export function useEngine(): TimelineEngine {
  return useTimelineContext();
}

// ---------------------------------------------------------------------------
// Context-based wrappers (engine from context, then delegate to hooks/index)
// ---------------------------------------------------------------------------

export function useTimeline(): ReturnType<typeof useTimelineEngine> {
  return useTimelineEngine(useTimelineContext());
}

export function useTrackIds(): ReturnType<typeof useTrackIdsEngine> {
  return useTrackIdsEngine(useTimelineContext());
}

export function useTrack(id: TrackId | string): ReturnType<typeof useTrackEngine> {
  return useTrackEngine(useTimelineContext(), id);
}

export function useClip(id: ClipId | string): ReturnType<typeof useClipEngine> {
  return useClipEngine(useTimelineContext(), id);
}

/** Returns { id, cursor } from a single subscription. Use useActiveToolId / useCursor for separate subs. */
export function useActiveTool(): { readonly id: string; readonly cursor: string } {
  const engine = useTimelineContext();
  const id = useActiveToolId(engine);
  const cursor = useCursor(engine);
  return useMemo(() => ({ id, cursor }), [id, cursor]);
}

/**
 * Returns { canUndo, canRedo } from a single subscription.
 * Prefer this over separate useCanUndo / useCanRedo to avoid duplicate subscriptions.
 */
export function useCanUndoRedo(): { canUndo: boolean; canRedo: boolean } {
  const engine = useTimelineContext();
  return useHistory(engine);
}

export function useCanUndo(): boolean {
  return useHistory(useTimelineContext()).canUndo;
}

export function useCanRedo(): boolean {
  return useHistory(useTimelineContext()).canRedo;
}

export function useProvisional(): ProvisionalState | null {
  return useProvisionalEngine(useTimelineContext());
}

export function useAllTracksContext(): ReturnType<typeof useAllTracks> {
  return useAllTracks(useTimelineContext());
}

export function useFpsContext(): ReturnType<typeof useFps> {
  return useFps(useTimelineContext());
}

export function useClipEffectsContext(clipId: ClipId | string): ReturnType<typeof useClipEffects> {
  return useClipEffects(useTimelineContext(), clipId);
}

export function useClipTransitionContext(clipId: ClipId | string): ReturnType<typeof useClipTransition> {
  return useClipTransition(useTimelineContext(), clipId);
}

export function useTrackCaptionsContext(trackId: TrackId | string): ReturnType<typeof useTrackCaptions> {
  return useTrackCaptions(useTimelineContext(), trackId);
}

export function useAllTransitionsContext(): ReturnType<typeof useAllTransitions> {
  return useAllTransitions(useTimelineContext());
}

// ---------------------------------------------------------------------------
// Phase 6 PlaybackEngine hooks (take PlaybackEngine, not TimelineEngine)
// ---------------------------------------------------------------------------

export { usePlayhead } from './hooks/usePlayhead';
export type { UsePlayheadResult } from './hooks/usePlayhead';
export { usePlayheadEvent } from './hooks/usePlayheadEvent';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { EngineSnapshot } from './engine';
