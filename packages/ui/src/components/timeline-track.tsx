import React from 'react';
import { useTimelineContext } from '../context/timeline-context';
import { useTrackWithEngine } from '@timelinx/react';
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

function getTrackColor(type: string): string {
  switch (type) {
    case 'audio': return 'rgba(56, 178, 172, 0.4)';
    case 'subtitle': return 'rgba(159, 122, 234, 0.4)';
    default: return 'rgba(75, 123, 236, 0.4)';
  }
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
  const iconColor = getTrackColor(track.type);

  return (
    <div
      className={`tl-track-label-card${className ? ` ${className}` : ''}`}
      style={{
        height,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            height: 26,
            borderRadius: 7,
            background: 'rgba(255,255,255,0.03)',
            flexShrink: 0,
          }}
        >
          <IconComponent size={13} style={{ color: iconColor }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.65)',
            lineHeight: '1.2',
            letterSpacing: '-0.01em',
          }}>
            {shortId}
          </span>
          {clipCount > 0 && (
            <span style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.2)',
              lineHeight: '1.3',
              marginTop: 1,
            }}>
              {clipCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
