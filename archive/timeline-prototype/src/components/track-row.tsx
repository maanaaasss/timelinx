import type { Track, Clip as ClipType, TimelineFrame } from '@timelinx/core';
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
  onSelectClip: (clipId: string, additive: boolean) => void;
  onUpdateClip: (clipId: string, start: TimelineFrame, end: TimelineFrame) => void;
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
  onSelectClip,
  onUpdateClip,
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
        onSelectClip={onSelectClip}
        onUpdateClip={onUpdateClip}
        onSeek={onSeek}
      />
    </div>
  );
}
