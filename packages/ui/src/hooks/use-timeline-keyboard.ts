import { useEffect, useCallback, type RefObject } from 'react';
import type { TimelineEngine } from '@timelinx/react';

export interface UseTimelineKeyboardOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  engine: TimelineEngine;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToolChange?: (toolId: string) => void;
  onPlayPause?: () => void;
  onCut?: () => void;
}

export function useTimelineKeyboard({
  containerRef,
  engine,
  onZoomIn,
  onZoomOut,
  onToolChange,
  onPlayPause,
  onCut,
}: UseTimelineKeyboardOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const el = containerRef.current;
      if (!el || !el.contains(document.activeElement)) return;

      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const shift = e.shiftKey ? 10 : 1;
      const currentFrame = engine.getPlayheadFrame();

      switch (e.code) {
        // ── Tool shortcuts ────────────────────────────────────────────────
        case 'KeyV':
          if (!e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            onToolChange?.('select');
          }
          break;

        case 'KeyB':
          if (!e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            onToolChange?.('razor');
          }
          break;

        case 'KeyH':
          if (!e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            onToolChange?.('hand');
          }
          break;

        case 'KeyC':
          if (!e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            onCut?.();
          }
          break;

        // ── Undo / Redo ───────────────────────────────────────────────────
        case 'KeyZ':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            if (e.shiftKey) {
              engine.redo();
            } else {
              engine.undo();
            }
          }
          break;

        // ── Playhead navigation ───────────────────────────────────────────
        case 'Space':
          e.preventDefault();
          onPlayPause?.();
          break;

        case 'ArrowLeft':
          e.preventDefault();
          engine.seekTo(Math.max(0, currentFrame - shift) as any);
          break;

        case 'ArrowRight':
          e.preventDefault();
          engine.seekTo((currentFrame + shift) as any);
          break;

        // ── Delete selected clips (single transaction) ────────────────────
        case 'Delete':
        case 'Backspace': {
          const snapshot = engine.getSnapshot();
          if (snapshot.selectedClipIds.size > 0) {
            e.preventDefault();
            const ops = [...snapshot.selectedClipIds].map((id) => ({
              type: 'DELETE_CLIP' as const,
              clipId: id,
            }));
            engine.dispatch({
              id: crypto.randomUUID(),
              label: ops.length === 1 ? 'Delete clip' : `Delete ${ops.length} clips`,
              timestamp: Date.now(),
              operations: ops,
            } as any);
            engine.clearSelection();
            containerRef.current?.focus();
          }
          break;
        }

        // ── Zoom ─────────────────────────────────────────────────────────
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
    [containerRef, engine, onZoomIn, onZoomOut, onToolChange, onPlayPause, onCut],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
