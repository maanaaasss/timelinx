import React from 'react';
import { frameToTimecode } from '../shared/time';

export interface DropZoneProps {
  frame: number;
  ppf: number;
  totalHeight: number;
  fps?: number;
  className?: string;
}

export const DropZone = React.memo(function DropZone({
  frame,
  ppf,
  totalHeight,
  fps = 30,
  className,
}: DropZoneProps) {
  return (
    <div
      className={`drop-zone${className ? ` ${className}` : ''}`}
      style={{
        position: 'absolute',
        left: frame * ppf,
        height: totalHeight,
        top: 0,
        width: 2,
        background: 'var(--tl-snap-color)',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.55), 0 0 18px rgba(255,209,102,0.35)',
        pointerEvents: 'none',
        zIndex: 30,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 4,
          left: 6,
          padding: '2px 4px',
          borderRadius: 2,
          background: 'var(--tl-snap-color)',
          color: 'var(--text-inverse)',
          fontSize: 9,
          fontWeight: 600,
        }}
      >
        {frameToTimecode(frame, fps)}
      </span>
    </div>
  );
});
