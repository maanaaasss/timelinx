import { useCallback, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { TimelineEngine } from '@timelinx/react';
import { usePlayheadFrame } from '@timelinx/react';
import { cn } from '../../shared/cn';

const HEADER_WIDTH_FALLBACK = 152;

function getHeaderWidth(): number {
  if (typeof document === 'undefined') return HEADER_WIDTH_FALLBACK;
  const val = getComputedStyle(document.documentElement)
    .getPropertyValue('--track-header-width')
    .trim();
  const px = parseFloat(val);
  return Number.isFinite(px) && px > 0 ? px : HEADER_WIDTH_FALLBACK;
}

export interface PlayheadProps {
  engine: TimelineEngine;
  ppf: number;
}

export function Playhead({ engine, ppf }: PlayheadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const currentTime = usePlayheadFrame(engine);
  const left = `calc(${currentTime * ppf}px + var(--track-header-width, ${HEADER_WIDTH_FALLBACK}px))`;

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      e.preventDefault();
      const target = e.currentTarget as HTMLElement;
      const pointerId = e.pointerId;
      try {
        target.setPointerCapture(pointerId);
      } catch {}
      setIsDragging(true);

      const el = target.closest<HTMLElement>('.tl-track-area');
      const headerEl = el?.querySelector<HTMLElement>('.tl-track-header');
      const measuredW = headerEl?.getBoundingClientRect().width;
      const headerW = measuredW && measuredW > 0 ? measuredW : getHeaderWidth();

      const handleMove = (ev: PointerEvent) => {
        const trackArea = el ?? target.closest<HTMLElement>('.tl-track-area');
        if (!trackArea) return;
        const rect = trackArea.getBoundingClientRect();
        const x = ev.clientX - rect.left + trackArea.scrollLeft - headerW;
        const frame = Math.max(0, Math.round(x / ppf));
        engine.seekTo(frame as any);
      };

      const handleUp = () => {
        setIsDragging(false);
        try {
          target.releasePointerCapture(pointerId);
        } catch {}
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleUp);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleUp);
    },
    [engine, ppf],
  );

  return (
    <div className={cn('tl-v2-playhead', isDragging && 'is-dragging')} style={{ left }}>
      <div className="tl-v2-playhead-hit" tabIndex={-1} onPointerDown={handlePointerDown} />
    </div>
  );
}
