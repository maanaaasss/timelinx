import { useRef, useCallback, type MouseEvent } from 'react';
import type { Track, Clip as ClipType } from '@timelinx/core';
import type { TimelineEngine } from '@timelinx/react';
import { useActiveToolId } from '@timelinx/react';
import { useOptionalMediaAssets } from '../../context/media-assets-context';
import { Clip } from './clip';

export interface TrackBodyProps {
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

function getClipType(clip: ClipType, tracks: readonly Track[]): 'video' | 'audio' | 'text' {
  const track = tracks.find((t) => t.id === clip.trackId);
  if (!track) return 'video';
  if (track.type === 'audio') return 'audio';
  if (track.type === 'subtitle' || track.type === 'title') return 'text';
  return 'video';
}

export function TrackBody({
  clips,
  ppf,
  fps,
  tracks,
  totalWidth,
  selectedClipIds,
  engine,
  onSeek,
}: TrackBodyProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const gridIntervalPx = ppf * fps;

  const activeToolId = useActiveToolId(engine);
  const mediaAssets = useOptionalMediaAssets();

  // Sort clips by timelineStart so we can find the next clip for each clip
  // (needed for the transition drag handle in Clip.tsx).
  const sortedClips = [...clips].sort(
    (a, b) => (a.timelineStart as number) - (b.timelineStart as number),
  );

  const handleClick = useCallback(
    (e: MouseEvent) => {
      const el = bodyRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left + el.scrollLeft;
      const frame = Math.max(0, Math.round(x / ppf));
      onSeek(frame);
    },
    [ppf, onSeek],
  );

  const isEmpty = clips.length === 0;

  return (
    <div
      ref={bodyRef}
      className="tl-track-body"
      data-tool={activeToolId}
      style={{ width: totalWidth } as React.CSSProperties}
      onClick={handleClick}
    >
      <div
        className="tl-track-body-grid"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent ${gridIntervalPx - 1}px, var(--tl-grid-line) ${gridIntervalPx - 1}px, var(--tl-grid-line) ${gridIntervalPx}px)`,
        }}
      />
      {isEmpty && (
        <div className="tl-empty-track">
          <span>Drop media here</span>
        </div>
      )}
      {sortedClips.map((clip, i) => {
        const thumb =
          (clip as any).thumbnailUrl ??
          (clip.metadata as any)?.thumbnailUrl ??
          (clip.assetId ? mediaAssets?.getThumbnail(clip.assetId) : undefined);
        return (
          <Clip
            key={clip.id}
            clip={clip}
            clipType={getClipType(clip, tracks)}
            ppf={ppf}
            engine={engine}
            isSelected={selectedClipIds.has(clip.id)}
            nextClip={sortedClips[i + 1] ?? null}
            thumbnailUrl={thumb}
          />
        );
      })}
    </div>
  );
}
