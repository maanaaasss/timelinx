import React from 'react';
import { usePlayheadFrame, useIsPlaying } from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';

export interface TimelinePlayheadProps {
  totalHeight: number;
  topOffset?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const TimelinePlayhead = React.memo(function TimelinePlayhead({
  totalHeight,
  topOffset = 0,
  className,
  style,
}: TimelinePlayheadProps) {
  const { engine, ppf } = useTimelineContext();
  const playheadFrame = usePlayheadFrame(engine);
  const isPlaying = useIsPlaying(engine);

  const x = (playheadFrame as number) * ppf;

  return (
    <div
      className={`tl-playhead${isPlaying ? ' tl-playhead--playing' : ''}${className ? ` ${className}` : ''}`}
      style={{
        height: totalHeight,
        transform: `translate3d(${x}px, 0px, 0px)`,
        ...style,
      }}
    >
      <div className="tl-playhead-handle">
        <div className="tl-playhead-handle-dot" />
      </div>
    </div>
  );
});
