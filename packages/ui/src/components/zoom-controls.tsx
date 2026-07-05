import React from 'react';
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
  const zoom = Math.max(1, Math.min(100, Math.round(ppf)));

  const handleZoomOut = () => {
    onPpfChange(Math.max(1, ppf * 0.8));
  };

  const handleZoomIn = () => {
    onPpfChange(Math.min(100, ppf * 1.25));
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPpfChange(parseFloat(e.target.value));
  };

  return (
    <div className={`zoom-controls${className ? ` ${className}` : ''}`}>
      <button className="tool-btn" title="Zoom out" onClick={handleZoomOut}>
        <IconZoomOut size={15} />
      </button>
      <input
        type="range"
        className="zoom-slider"
        min={1}
        max={100}
        value={zoom}
        onChange={handleSliderChange}
        aria-label="Zoom level"
      />
      <span className="zoom-level">{zoom}x</span>
      <button className="tool-btn" title="Zoom in" onClick={handleZoomIn}>
        <IconZoomIn size={15} />
      </button>
    </div>
  );
});
