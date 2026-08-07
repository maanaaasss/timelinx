import type { Track, Clip as ClipType, TimelineFrame } from '@timelinx/core';
import { TrackRow } from './track-row';

export interface TrackListProps {
  tracks: readonly Track[];
  clips: readonly ClipType[];
  ppf: number;
  fps: number;
  totalWidth: number;
  selectedClipIds: ReadonlySet<string>;
  onSelectClip: (clipId: string, additive: boolean) => void;
  onUpdateClip: (clipId: string, start: TimelineFrame, end: TimelineFrame) => void;
  onSeek: (frame: number) => void;
}

export function TrackList({
  tracks,
  clips,
  ppf,
  fps,
  totalWidth,
  selectedClipIds,
  onSelectClip,
  onUpdateClip,
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
            onSelectClip={onSelectClip}
            onUpdateClip={onUpdateClip}
            onSeek={onSeek}
          />
        );
      })}
    </>
  );
}
