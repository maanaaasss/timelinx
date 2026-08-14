import { useMemo } from 'react';
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
  heights?: Record<string, number>;
  onHeightChange?: (trackId: string, height: number) => void;
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
  heights,
  onHeightChange,
}: TrackListProps) {
  // Memoize per-track clip lists to avoid re-slicing on every render.
  // `clips` reference changes when any clip moves, but individual track
  // slices only need to change when clips on *that* track change.
  const clipsByTrack = useMemo(() => {
    const map = new Map<string, ClipType[]>();
    for (const clip of clips) {
      let list = map.get(clip.trackId);
      if (!list) {
        list = [];
        map.set(clip.trackId, list);
      }
      list.push(clip);
    }
    return map;
  }, [clips]);

  return (
    <>
      {tracks.map((track) => (
        <TrackRow
          key={track.id}
          track={track}
          clips={clipsByTrack.get(track.id) ?? []}
          ppf={ppf}
          fps={fps}
          tracks={tracks}
          totalWidth={totalWidth}
          selectedClipIds={selectedClipIds}
          engine={engine}
          onSeek={onSeek}
          height={heights?.[track.id]}
          onHeightChange={onHeightChange}
        />
      ))}
    </>
  );
}
