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
      onScrollHorizontal(e.currentTarget.scrollLeft);
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
