import { useRef, useCallback, type UIEvent } from 'react';
import type { Track, Clip } from '@timelinx/core';
import type { TimelineEngine } from '@timelinx/react';
import { TrackList } from './track-list';
import { Playhead } from './playhead';

export interface TimelineTrackAreaV2Props {
  tracks: readonly Track[];
  clips: readonly Clip[];
  ppf: number;
  fps: number;
  duration: number;
  selectedClipIds: ReadonlySet<string>;
  engine: TimelineEngine;
  onScrollHorizontal: (scrollLeft: number) => void;
  heights?: Record<string, number>;
  onHeightChange?: (trackId: string, height: number) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function TimelineTrackAreaV2({
  tracks,
  clips,
  ppf,
  fps,
  duration,
  selectedClipIds,
  engine,
  onScrollHorizontal,
  heights,
  onHeightChange,
  scrollContainerRef,
}: TimelineTrackAreaV2Props) {
  const internalRef = useRef<HTMLDivElement>(null);
  const scrollRef = scrollContainerRef ?? internalRef;

  const handleScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      const sl = el.scrollLeft;
      if (sl < 0) {
        el.scrollLeft = 0;
        onScrollHorizontal(0);
        return;
      }
      if (sl > maxScroll) {
        el.scrollLeft = maxScroll;
        onScrollHorizontal(maxScroll);
        return;
      }
      onScrollHorizontal(sl);
    },
    [onScrollHorizontal],
  );

  const totalWidth = duration * ppf;

  return (
    <div className="tl-track-area" ref={scrollRef} onScroll={handleScroll}>
      <div className="tl-track-list-wrapper">
        <TrackList
          tracks={tracks}
          clips={clips}
          ppf={ppf}
          fps={fps}
          totalWidth={totalWidth}
          selectedClipIds={selectedClipIds}
          engine={engine}
          heights={heights}
          onHeightChange={onHeightChange}
        />
        <Playhead engine={engine} ppf={ppf} interactive={false} />
      </div>
    </div>
  );
}
