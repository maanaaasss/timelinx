import { useCallback, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { cn } from '../lib/cn';

export interface PlayheadProps {
  currentTime: number;
  ppf: number;
  onDragStart?: () => void;
}

export function Playhead({ currentTime, ppf, onDragStart }: PlayheadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const left = currentTime * ppf;

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
      onDragStart?.();

      const handleUp = () => {
        setIsDragging(false);
        document.removeEventListener('pointerup', handleUp);
      };
      document.addEventListener('pointerup', handleUp);
    },
    [onDragStart],
  );

  return (
    <div className={cn('tl-playhead', isDragging && 'is-dragging')} style={{ left }}>
      <div
        className="tl-playhead-hit"
        tabIndex={-1}
        onPointerDown={handlePointerDown}
      />
    </div>
  );
}
