import { useCallback, useRef } from 'react';

interface PlayheadProps {
  frame: number;
  ppf: number;
  onSeek?: (frame: number) => void;
}

export function Playhead({ frame, ppf, onSeek }: PlayheadProps) {
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startFrameRef = useRef(0);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!onSeek) return;
      isDraggingRef.current = true;
      startXRef.current = e.clientX;
      startFrameRef.current = frame;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      e.stopPropagation();
    },
    [frame, onSeek],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current || !onSeek) return;
      const deltaX = e.clientX - startXRef.current;
      const deltaFrames = Math.round(deltaX / ppf);
      const nextFrame = Math.max(0, startFrameRef.current + deltaFrames);
      onSeek(nextFrame);
    },
    [ppf, onSeek],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // Pointer capture may have already been released
      }
    }
  }, []);

  return (
    <div
      className="playhead"
      style={{
        transform: `translateX(${frame * ppf}px)`,
        pointerEvents: onSeek ? 'auto' : 'none',
        cursor: onSeek ? 'ew-resize' : undefined,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
