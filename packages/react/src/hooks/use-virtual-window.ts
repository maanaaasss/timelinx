/**
 * Virtual rendering hooks — Phase R Step 3
 *
 * useVirtualWindow: derived from viewport/scroll/zoom (useMemo).
 * useVisibleClips: subscribes to engine and returns clips in window (useSyncExternalStore).
 * Result is cached so same (state, window) returns same reference (avoids infinite loop).
 */

import { useMemo, useSyncExternalStore, useRef } from 'react';
import type { TimelineEngine } from '../engine';
import type { VirtualWindow, VirtualClipEntry, TimelineState } from '@timelinx/core';
import { getVisibleFrameRange, getVisibleClips } from '@timelinx/core';

export function useVirtualWindow(
  _engine: TimelineEngine,
  viewportWidth: number,
  scrollLeft: number,
  pixelsPerFrame: number,
): VirtualWindow {
  return useMemo(
    () => getVisibleFrameRange(viewportWidth, scrollLeft, pixelsPerFrame),
    [viewportWidth, scrollLeft, pixelsPerFrame],
  );
}

export function useVisibleClips(
  engine: TimelineEngine,
  virtualWindow: VirtualWindow,
): VirtualClipEntry[] {
  const state = useSyncExternalStore(
    engine.subscribe,
    () => engine.getSnapshot().state,
    () => engine.getSnapshot().state,
  );

  const cacheRef = useRef<{
    state: TimelineState | null;
    window: VirtualWindow | null;
    result: VirtualClipEntry[];
  }>({ state: null, window: null, result: [] });

  return useMemo(() => {
    const cache = cacheRef.current;
    if (cache.state === state && cache.window === virtualWindow) return cache.result;
    const result = getVisibleClips(state, virtualWindow);
    cache.state = state;
    cache.window = virtualWindow;
    cache.result = result;
    return result;
  }, [state, virtualWindow]);
}
