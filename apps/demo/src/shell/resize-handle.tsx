import React, { useRef, useCallback, useState } from 'react';

export function ResizeHandle({
  onResize,
}: {
  onResize: (upperHeight: number) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startYRef.current = e.clientY;

      // Get the current height of the upper panel
      const upper = (e.target as HTMLElement).previousElementSibling as HTMLElement;
      if (upper) {
        startHeightRef.current = upper.getBoundingClientRect().height;
      }

      const handleMouseMove = (ev: MouseEvent) => {
        const delta = ev.clientY - startYRef.current;
        const newHeight = Math.max(120, Math.min(window.innerHeight * 0.65, startHeightRef.current + delta));
        onResize(newHeight);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [onResize],
  );

  return (
    <div
      className={`demo-resize-handle ${isDragging ? 'is-dragging' : ''}`}
      onMouseDown={handleMouseDown}
    />
  );
}
