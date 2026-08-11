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
  onSeek: (frame: number) => void;
  onScrollHorizontal: (scrollLeft: number) => void;
  heights?: Record<string, number>;
  onHeightChange?: (trackId: string, height: number) => void;
}

export function TimelineTrackAreaV2({
  tracks,
  clips,
  ppf,
  fps,
  duration,
  selectedClipIds,
  engine,
  onSeek,
  onScrollHorizontal,
  heights,
  onHeightChange,
}: TimelineTrackAreaV2Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      onScrollHorizontal(e.currentTarget.scrollLeft);
    },
    [onScrollHorizontal],
  );

  const totalWidth = duration * ppf;

  return (
    <div className="tl-track-area" ref={scrollRef} onScroll={handleScroll}>
      <TrackList
        tracks={tracks}
        clips={clips}
        ppf={ppf}
        fps={fps}
        totalWidth={totalWidth}
        selectedClipIds={selectedClipIds}
        engine={engine}
        onSeek={onSeek}
        heights={heights}
        onHeightChange={onHeightChange}
      />
      <Playhead engine={engine} ppf={ppf} />
    </div>
  );
}
