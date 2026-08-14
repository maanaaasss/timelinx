import { useCallback, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { TimelineEngine } from '@timelinx/react';
import { cn } from '../../shared/cn';

export interface PlayheadProps {
  engine: TimelineEngine;
  ppf: number;
}

export function Playhead({ engine, ppf }: PlayheadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const currentTime = engine.getPlayheadFrame();
  const left = currentTime * ppf;

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);

      const handleMove = (ev: PointerEvent) => {
        const el = (e.target as HTMLElement).closest('.tl-track-area');
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = ev.clientX - rect.left + el.scrollLeft;
        const frame = Math.max(0, Math.round(x / ppf));
        engine.seekTo(frame as any);
      };

      const handleUp = () => {
        setIsDragging(false);
        document.removeEventListener('pointermove', handleMove);
        document.removeEventListener('pointerup', handleUp);
      };

      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
    },
    [engine, ppf],
  );

  return (
    <div className={cn('tl-v2-playhead', isDragging && 'is-dragging')} style={{ left }}>
      <div className="tl-v2-playhead-hit" tabIndex={-1} onPointerDown={handlePointerDown} />
    </div>
  );
}
