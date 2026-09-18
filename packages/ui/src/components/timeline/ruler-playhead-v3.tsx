import { useCallback, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { cn } from '../../shared/cn';

export interface RulerPlayheadV3Props {
  currentTime: number;
  ppf: number;
  scrollLeft?: number;
  duration?: number;
  onDragStart?: () => void;
  onSeek?: (frame: number) => void;
  showLine?: boolean;
  className?: string;
  wrapperRef?: React.Ref<HTMLDivElement>;
}

export function RulerPlayheadV3({
  currentTime,
  ppf,
  scrollLeft = 0,
  duration,
  onDragStart,
  onSeek,
  showLine = true,
  className,
  wrapperRef,
}: RulerPlayheadV3Props) {
  const [isDragging, setIsDragging] = useState(false);
  const left = currentTime * ppf - scrollLeft;

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const pointerId = e.pointerId;
      try {
        target.setPointerCapture(pointerId);
      } catch {}
      setIsDragging(true);
      onDragStart?.();

      const startX = e.clientX;
      const startFrame = currentTime;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!onSeek) return;
        const deltaPx = moveEvent.clientX - startX;
        const deltaFrames = Math.round(deltaPx / ppf);
        const nextFrame = Math.max(
          0,
          duration != null
            ? Math.min(duration, startFrame + deltaFrames)
            : startFrame + deltaFrames,
        );
        onSeek(nextFrame);
      };

      const handlePointerUp = () => {
        setIsDragging(false);
        try {
          target.releasePointerCapture(pointerId);
        } catch {}
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [currentTime, ppf, duration, onDragStart, onSeek],
  );

  return (
    <div
      ref={wrapperRef}
      className={cn('tl-ruler-v3-playhead-wrapper', isDragging && 'is-dragging', className)}
      style={{ left }}
      role="slider"
      aria-label="Timeline Playhead"
      aria-valuenow={currentTime}
      tabIndex={0}
    >
      <div
        className="tl-ruler-v3-playhead-handle"
        onPointerDown={handlePointerDown}
        title={`Playhead: frame ${currentTime}`}
      >
        <svg
          width="14"
          height="16"
          viewBox="0 0 14 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="tl-ruler-v3-playhead-svg"
        >
          <path
            d="M1 1.5C1 1.22386 1.22386 1 1.5 1H12.5C12.7761 1 13 1.22386 13 1.5V9.5L7 15L1 9.5V1.5Z"
            fill="#ffffff"
          />
        </svg>
      </div>
      {showLine && <div className="tl-ruler-v3-playhead-line" />}
    </div>
  );
}
