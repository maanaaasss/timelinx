import { useEffect, useCallback, type RefObject } from 'react';
import type { FrameRate } from '@timelinx/core';

export interface UseTimelineKeyboardOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  fps: FrameRate;
  currentTime: number;
  onSeek: (frame: number) => void;
  selectedClipIds: ReadonlySet<string>;
  onNudgeClip: (clipId: string, deltaFrames: number) => void;
  onDeleteClip: (clipId: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export function useTimelineKeyboard({
  containerRef,
  fps,
  currentTime,
  onSeek,
  selectedClipIds,
  onNudgeClip,
  onDeleteClip,
  onZoomIn,
  onZoomOut,
  isPlaying,
  onTogglePlay,
}: UseTimelineKeyboardOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const el = containerRef.current;
      if (!el || !el.contains(document.activeElement)) return;

      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const shift = e.shiftKey ? 10 : 1;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          onTogglePlay();
          break;

        case 'ArrowLeft':
          e.preventDefault();
          onSeek(Math.max(0, currentTime - shift));
          break;

        case 'ArrowRight':
          e.preventDefault();
          onSeek(currentTime + shift);
          break;

        case 'ArrowUp':
          if (selectedClipIds.size > 0) {
            e.preventDefault();
            selectedClipIds.forEach((id) => onNudgeClip(id, -shift));
          }
          break;

        case 'ArrowDown':
          if (selectedClipIds.size > 0) {
            e.preventDefault();
            selectedClipIds.forEach((id) => onNudgeClip(id, shift));
          }
          break;

        case 'Delete':
        case 'Backspace':
          if (selectedClipIds.size > 0) {
            e.preventDefault();
            selectedClipIds.forEach((id) => onDeleteClip(id));
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
    [
      containerRef,
      currentTime,
      fps,
      onSeek,
      selectedClipIds,
      onNudgeClip,
      onDeleteClip,
      onZoomIn,
      onZoomOut,
      isPlaying,
      onTogglePlay,
    ],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
