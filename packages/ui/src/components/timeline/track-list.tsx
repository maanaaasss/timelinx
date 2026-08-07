import type { Track, Clip as ClipType } from '@timelinx/core';
import type { TimelineEngine } from '@timelinx/react';
import { TrackRow } from './track-row';

export interface TrackListProps {
  tracks: readonly Track[];
  clips: readonly ClipType[];
  ppf: number;
  fps: number;
  totalWidth: number;
  selectedClipIds: ReadonlySet<string>;
  engine: TimelineEngine;
  onSeek: (frame: number) => void;
}

export function TrackList({
  tracks,
  clips,
  ppf,
  fps,
  totalWidth,
  selectedClipIds,
  engine,
  onSeek,
}: TrackListProps) {
  return (
    <>
      {tracks.map((track) => {
        const trackClips = clips.filter((c) => c.trackId === track.id);
        return (
          <TrackRow
            key={track.id}
            track={track}
            clips={trackClips}
            ppf={ppf}
            fps={fps}
            tracks={tracks}
            totalWidth={totalWidth}
            selectedClipIds={selectedClipIds}
            engine={engine}
            onSeek={onSeek}
          />
        );
      })}
    </>
  );
}
