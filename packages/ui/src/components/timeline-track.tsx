import React from 'react';
import { useTimelineContext } from '../context/timeline-context';
import { useTrackWithEngine } from '@timelinx/react';
import { IconVideo, IconMusic, IconSubtitle } from './icons';
import { Eye, EyeOff, Lock, Unlock } from 'lucide-react';

declare module '@timelinx/react' {
  interface TimelineEngine {
    toggleTrackMute(trackId: string): { accepted: boolean };
    toggleTrackLock(trackId: string): { accepted: boolean };
  }
}

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
  const VisibilityIcon = track.muted ? EyeOff : Eye;
  const LockIcon = track.locked ? Lock : Unlock;

  return (
    <div
      className={`tl-track tl-track--${track.type}${className ? ` ${className}` : ''}`}
      style={{
        height,
        ...style,
      }}
    >
      <div className="tl-track-header">
        <div className="tl-track-dot" />
        <span className="tl-track-icon">
          <IconComponent size={11} />
        </span>
        <span className="tl-track-label">{shortId}</span>
        <div className="tl-track-controls">
          <button
            className={`tl-ctrl-btn ${track.muted ? 'muted' : ''}`}
            title={track.type === 'audio' ? 'Mute' : 'Hide'}
            onClick={(e) => {
              e.stopPropagation();
              engine.toggleTrackMute(track.id);
            }}
          >
            <VisibilityIcon size={12} />
          </button>
          <button
            className={`tl-ctrl-btn ${track.locked ? 'locked' : ''}`}
            title="Lock"
            onClick={(e) => {
              e.stopPropagation();
              engine.toggleTrackLock(track.id);
            }}
          >
            <LockIcon size={12} />
          </button>
        </div>
      </div>
    </div>
  );
});
