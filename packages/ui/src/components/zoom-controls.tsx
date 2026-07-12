import React, { useCallback } from 'react';
import { IconZoomIn, IconZoomOut } from './icons';

export interface ZoomControlsProps {
  ppf: number;
  onPpfChange: (ppf: number) => void;
  className?: string;
}

export const ZoomControls = React.memo(function ZoomControls({
  ppf,
  onPpfChange,
  className,
}: ZoomControlsProps) {
  const min = 1;
  const max = 100;
  const zoom = Math.max(min, Math.min(max, Math.round(ppf)));
  const fillPct = ((zoom - min) / (max - min)) * 100;

  const handleZoomOut = useCallback(() => {
    onPpfChange(Math.max(min, ppf * 0.8));
  }, [onPpfChange, ppf]);

  const handleZoomIn = useCallback(() => {
    onPpfChange(Math.min(max, ppf * 1.25));
  }, [onPpfChange, ppf]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onPpfChange(parseFloat(e.target.value));
  }, [onPpfChange]);

  return (
    <div className={`zoom-controls${className ? ` ${className}` : ''}`}>
      <button className="tool-btn" title="Zoom out" onClick={handleZoomOut}>
        <IconZoomOut size={15} />
      </button>
      <input
        type="range"
        className="zoom-slider"
        min={min}
        max={max}
        value={zoom}
        onChange={handleSliderChange}
        aria-label="Zoom level"
        style={{ '--zoom-fill': `${fillPct}%` } as React.CSSProperties}
      />
      <span className="zoom-level">{zoom}x</span>
      <button className="tool-btn" title="Zoom in" onClick={handleZoomIn}>
        <IconZoomIn size={15} />
      </button>
    </div>
  );
});
