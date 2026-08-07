import type { Track, Clip as ClipType } from '@timelinx/core';
import type { TimelineEngine } from '@timelinx/react';
import { TrackHeader } from './track-header';
import { TrackBody } from './track-body';

export interface TrackRowProps {
  track: Track;
  clips: readonly ClipType[];
  ppf: number;
  fps: number;
  tracks: readonly Track[];
  totalWidth: number;
  selectedClipIds: ReadonlySet<string>;
  engine: TimelineEngine;
  onSeek: (frame: number) => void;
}

export function TrackRow({
  track,
  clips,
  ppf,
  fps,
  tracks,
  totalWidth,
  selectedClipIds,
  engine,
  onSeek,
}: TrackRowProps) {
  return (
    <div className="tl-track-row">
      <TrackHeader track={track} />
      <TrackBody
        track={track}
        clips={clips}
        ppf={ppf}
        fps={fps}
        tracks={tracks}
        totalWidth={totalWidth}
        selectedClipIds={selectedClipIds}
        engine={engine}
        onSeek={onSeek}
      />
    </div>
  );
}
