import { useEffect, useCallback, type RefObject } from 'react';
import type { TimelineEngine } from '@timelinx/react';

export interface UseTimelineKeyboardOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  engine: TimelineEngine;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function useTimelineKeyboard({
  containerRef,
  engine,
  onZoomIn,
  onZoomOut,
}: UseTimelineKeyboardOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const el = containerRef.current;
      if (!el || !el.contains(document.activeElement)) return;

      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const shift = e.shiftKey ? 10 : 1;
      const snapshot = engine.getSnapshot();
      const currentFrame = engine.getPlayheadFrame();

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          // Toggle play/pause if playback engine exists
          break;

        case 'ArrowLeft':
          e.preventDefault();
          engine.seekTo(Math.max(0, currentFrame - shift) as any);
          break;

        case 'ArrowRight':
          e.preventDefault();
          engine.seekTo((currentFrame + shift) as any);
          break;

        case 'ArrowUp':
          if (snapshot.selectedClipIds.size > 0) {
            e.preventDefault();
            snapshot.selectedClipIds.forEach((id) => {
              const clip = engine.getState().timeline.tracks
                .flatMap((t: any) => t.clips)
                .find((c: any) => c.id === id);
              if (clip) {
                const dur = clip.timelineEnd - clip.timelineStart;
                const newStart = Math.max(0, clip.timelineStart - shift);
                engine.dispatch({
                  id: crypto.randomUUID(),
                  label: 'Nudge clip',
                  timestamp: Date.now(),
                  operations: [{ type: 'MOVE_CLIP', clipId: id, newTimelineStart: newStart as any }],
                } as any);
              }
            });
          }
          break;

        case 'ArrowDown':
          if (snapshot.selectedClipIds.size > 0) {
            e.preventDefault();
            snapshot.selectedClipIds.forEach((id) => {
              const clip = engine.getState().timeline.tracks
                .flatMap((t: any) => t.clips)
                .find((c: any) => c.id === id);
              if (clip) {
                const newStart = clip.timelineStart + shift;
                engine.dispatch({
                  id: crypto.randomUUID(),
                  label: 'Nudge clip',
                  timestamp: Date.now(),
                  operations: [{ type: 'MOVE_CLIP', clipId: id, newTimelineStart: newStart as any }],
                } as any);
              }
            });
          }
          break;

        case 'Delete':
        case 'Backspace':
          if (snapshot.selectedClipIds.size > 0) {
            e.preventDefault();
            snapshot.selectedClipIds.forEach((id) => {
              engine.dispatch({
                id: crypto.randomUUID(),
                label: 'Delete clip',
                timestamp: Date.now(),
                operations: [{ type: 'DELETE_CLIP', clipId: id }],
              } as any);
            });
            engine.clearSelection();
            containerRef.current?.focus();
          }
          break;

        case 'Equal':
        case 'NumpadAdd':
          e.preventDefault();
          onZoomIn();
          break;

        case 'Minus':
        case 'NumpadSubtract':
          e.preventDefault();
          onZoomOut();
          break;
      }
    },
    [containerRef, engine, onZoomIn, onZoomOut],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
