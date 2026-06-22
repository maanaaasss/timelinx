/**
 * StudioPlayhead — broadcast-noir playhead.
 *
 * Sharp angular chevron head, thin amber line, subtle glow.
 * No decorative triangle — the head is an angular V-shape.
 */
import React from 'react';
import { usePlayheadFrame } from '@webpacked-timeline/react';
import { useTimelineContext } from '../../context/timeline-context';

export interface StudioPlayheadProps {
  totalHeight: number;
  topOffset?: number;
}

export const StudioPlayhead = React.memo(function StudioPlayhead({ totalHeight, topOffset = 0 }: StudioPlayheadProps) {
  const { engine, ppf } = useTimelineContext();
  const frame = usePlayheadFrame(engine);

  const left = (frame as number) * ppf;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: left - 1,
        top: 0,
        width: 2,
        height: totalHeight + topOffset,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      {/* Glow line */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 1,
          height: '100%',
          background: 'var(--tl-playhead-color)',
          boxShadow: '0 0 6px rgba(212, 168, 74, 0.25), 0 0 1px var(--tl-playhead-color)',
        }}
      />
      {/* Angular chevron head */}
      <div
        style={{
          position: 'absolute',
          left: -5,
          top: 0,
          width: 12,
          height: 10,
          background: 'var(--tl-playhead-color)',
          clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
        }}
      />
    </div>
  );
});
