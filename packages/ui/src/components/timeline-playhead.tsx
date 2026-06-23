import React from 'react';
import { usePlayheadFrame } from '@webpacked-timeline/react';
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

  const x = (playheadFrame as number) * ppf;

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        top: topOffset,
        left: 0,
        height: totalHeight,
        pointerEvents: 'none',
        zIndex: 50,
        transform: `translate3d(${x}px, 0px, 0px)`,
        ...style,
      }}
    >
      {/* Thin vertical line */}
      <div
        className="tl-playhead-line"
        style={{
          height: '100%',
          width: 'var(--tl-playhead-width, 1.5px)',
        }}
      />
      {/* Rounded head at top */}
      <div
        className="tl-playhead-head"
        style={{ top: 0 }}
      />
    </div>
  );
});
