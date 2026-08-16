import { useRef, useCallback, type UIEvent } from 'react';
import type { Track, Clip, TimelineFrame } from '@timelinx/core';
import { TrackList } from './track-list';
import { Playhead } from './playhead';

export interface TimelineTrackAreaProps {
  tracks: readonly Track[];
  clips: readonly Clip[];
  ppf: number;
  fps: number;
  duration: number;
  currentTime: number;
  selectedClipIds: ReadonlySet<string>;
  onSelectClip: (clipId: string, additive: boolean) => void;
  onUpdateClip: (clipId: string, start: TimelineFrame, end: TimelineFrame) => void;
  onSeek: (frame: number) => void;
  onPlayheadDragStart: (containerRef: React.RefObject<HTMLDivElement | null>) => void;
  onScrollHorizontal: (scrollLeft: number) => void;
}

export function TimelineTrackArea({
  tracks,
  clips,
  ppf,
  fps,
  duration,
  currentTime,
  selectedClipIds,
  onSelectClip,
  onUpdateClip,
  onSeek,
  onPlayheadDragStart,
  onScrollHorizontal,
}: TimelineTrackAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      onScrollHorizontal(e.currentTarget.scrollLeft);
    },
    [onScrollHorizontal],
  );

  const handlePlayheadDragStart = useCallback(() => {
    onPlayheadDragStart(scrollRef);
  }, [onPlayheadDragStart]);

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
        onSelectClip={onSelectClip}
        onUpdateClip={onUpdateClip}
        onSeek={onSeek}
      />
      <Playhead currentTime={currentTime} ppf={ppf} onDragStart={handlePlayheadDragStart} />
    </div>
  );
}
