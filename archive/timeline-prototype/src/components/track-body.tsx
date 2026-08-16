import { useRef, useCallback, type MouseEvent } from 'react';
import type { Track, Clip as ClipType, TimelineFrame } from '@timelinx/core';
import { Clip } from './clip';
import { getClipType } from '../mocks/timeline-data';

export interface TrackBodyProps {
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

export function TrackBody({
  clips,
  ppf,
  fps,
  tracks,
  totalWidth,
  selectedClipIds,
  onSelectClip,
  onUpdateClip,
  onSeek,
}: TrackBodyProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const gridIntervalPx = ppf * fps;

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
      style={
        {
          width: totalWidth,
          cursor: 'text',
          '--ppf': `${ppf}px`,
          '--fps': fps,
        } as React.CSSProperties
      }
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
      {clips.map((clip) => (
        <Clip
          key={clip.id}
          clip={clip}
          clipType={getClipType(clip, tracks)}
          ppf={ppf}
          fps={fps}
          isSelected={selectedClipIds.has(clip.id)}
          onSelect={onSelectClip}
          onUpdate={onUpdateClip}
        />
      ))}
    </div>
  );
}
