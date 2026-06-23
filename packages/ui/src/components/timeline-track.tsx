import React from 'react';
import { useTimelineContext } from '../context/timeline-context';
import { useTrackWithEngine } from '@webpacked-timeline/react';
import { IconVideo, IconMusic, IconSubtitle } from './icons';

export interface TimelineTrackProps {
  trackId: string;
  shortId: string;
  height: number;
  clipCount: number;
  onDelete?: (trackId: string) => void;
  onAddClip?: (trackId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

function getTrackIcon(type: string) {
  switch (type) {
    case 'audio': return IconMusic;
    case 'subtitle': return IconSubtitle;
    default: return IconVideo;
  }
}

function getTrackLabel(type: string, index: number): string {
  const prefix = type === 'video' ? 'Video' : type === 'audio' ? 'Audio' : type === 'subtitle' ? 'Subtitles' : 'Track';
  return `${prefix} ${index + 1}`;
}

export const TimelineTrack = React.memo(function TimelineTrack({
  trackId,
  shortId,
  height,
  clipCount,
  onDelete,
  onAddClip,
  className,
  style,
}: TimelineTrackProps) {
  const { engine } = useTimelineContext();
  const track = useTrackWithEngine(engine, trackId);

  if (!track) return null;

  const IconComponent = getTrackIcon(track.type);

  return (
    <div
      className={`tl-track-label-card${className ? ` ${className}` : ''}`}
      style={{
        height,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'var(--tl-surface-hover)',
            flexShrink: 0,
          }}
        >
          <IconComponent size={14} style={{ color: 'var(--tl-label-text)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--tl-text)',
            lineHeight: '1.3',
            letterSpacing: '0.01em',
          }}>
            {shortId}
          </span>
          <span style={{
            fontSize: 10,
            color: 'var(--tl-label-text-dim)',
            lineHeight: '1.3',
          }}>
            {clipCount} {clipCount === 1 ? 'clip' : 'clips'}
          </span>
        </div>
      </div>
    </div>
  );
});
