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
  /** Override height from local state (track-resize in progress).
   *  Falls back to track.height from engine state. */
  height?: number;
  onHeightChange?: (trackId: string, height: number) => void;
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
  height,
  onHeightChange,
}: TrackRowProps) {
  // Use the override height when a resize gesture is in progress;
  // fall back to the engine-committed height stored on the track.
  const resolvedHeight = height ?? track.height;

  return (
    <div className="tl-track-row" style={{ height: resolvedHeight, minHeight: resolvedHeight }}>
      <TrackHeader
        track={track}
        engine={engine}
        height={resolvedHeight}
        onHeightChange={onHeightChange}
      />
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
