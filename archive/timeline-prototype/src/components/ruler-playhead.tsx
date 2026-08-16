import { useCallback, type PointerEvent as ReactPointerEvent } from 'react';

export interface RulerPlayheadProps {
  currentTime: number;
  ppf: number;
  onDragStart?: () => void;
}

export function RulerPlayhead({ currentTime, ppf, onDragStart }: RulerPlayheadProps) {
  const left = currentTime * ppf;

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onDragStart?.();
    },
    [onDragStart],
  );

  return (
    <div className="tl-ruler-playhead-wrapper" style={{ left }} onPointerDown={handlePointerDown}>
      <div className="tl-ruler-playhead" />
    </div>
  );
}
