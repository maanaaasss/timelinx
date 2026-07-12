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
            left: frame * ppf,
            height: totalHeight,
          }}
        />
      ))}
    </>
  );
});
