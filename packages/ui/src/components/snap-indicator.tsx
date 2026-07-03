import React from 'react';

export interface SnapIndicatorProps {
  frames: number[];
  ppf: number;
  totalHeight: number;
  className?: string;
}

export const SnapIndicator = React.memo(function SnapIndicator({
  frames,
  ppf,
  totalHeight,
  className,
}: SnapIndicatorProps) {
  if (frames.length === 0) return null;

  return (
    <>
      {frames.map((frame) => (
        <div
          key={`snap-${frame}`}
          className={`snap-indicator${className ? ` ${className}` : ''}`}
          style={{
            position: 'absolute',
            left: frame * ppf,
            top: 0,
            width: 1,
            height: totalHeight,
            background: 'var(--tl-snap-color)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.55), 0 0 18px rgba(255,209,102,0.3)',
            pointerEvents: 'none',
            zIndex: 15,
          }}
        />
      ))}
    </>
  );
});
