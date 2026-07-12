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
        left: frame * ppf,
        height: totalHeight,
      }}
    >
      <span className="drop-zone-label">
        {frameToTimecode(frame, fps)}
      </span>
    </div>
  );
});
