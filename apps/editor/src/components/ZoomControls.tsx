import { useCallback } from 'react';

interface ZoomControlsProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  zoom?: number;
}

export function ZoomControls({ zoom = 4 }: ZoomControlsProps) {
  const handleZoomIn = useCallback(() => {
    const event = new CustomEvent('timeline-zoom', { detail: { delta: 1.25 } });
    window.dispatchEvent(event);
  }, []);

  const handleZoomOut = useCallback(() => {
    const event = new CustomEvent('timeline-zoom', { detail: { delta: 0.8 } });
    window.dispatchEvent(event);
  }, []);

  return (
    <div className="tool-group">
      <button
        className="tool-btn"
        title="Zoom Out"
        onClick={handleZoomOut}
      >
        −
      </button>
      <span className="zoom-display">{zoom}x</span>
      <button
        className="tool-btn"
        title="Zoom In"
        onClick={handleZoomIn}
      >
        +
      </button>
    </div>
  );
}
