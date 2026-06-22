/**
 * DaVinciPlayhead — the red playhead line + head triangle.
 *
 * Reads frame from engine via hook, ppf from context.
 * Rendered as an absolute-positioned overlay.
 */
import React, { useMemo } from 'react';
import { usePlayheadFrame } from '@webpacked-timeline/react';
import { useTimelineContext } from '../../context/timeline-context';

export interface DaVinciPlayheadProps {
  /** Total height of the track area (line extends full height) */
  totalHeight: number;
  /** Extra top offset (e.g. for add-track header alignment) */
  topOffset?: number;
}

export const DaVinciPlayhead = React.memo(function DaVinciPlayhead({ totalHeight, topOffset = 0 }: DaVinciPlayheadProps) {
  const { engine, ppf } = useTimelineContext();
  const frame = usePlayheadFrame(engine);

  const left = (frame as number) * ppf;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left,
        top: 0,
        width: 1,
        height: totalHeight + topOffset,
        background: 'var(--tl-playhead-color)',
        opacity: 0.9,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
});
