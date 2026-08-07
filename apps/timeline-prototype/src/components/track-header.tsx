import type { Track } from '@timelinx/core';
import { cn } from '../lib/cn';
import {
  GripVertical,
  Video,
  Volume2,
  VolumeX,
  Headphones,
  Lock,
  Unlock,
  Eye,
} from 'lucide-react';

export interface TrackHeaderProps {
  track: Track;
  isSelected?: boolean;
}

const trackTypeIcon: Record<string, typeof Video> = {
  video: Video,
  audio: Volume2,
};

const trackTypeColorVar: Record<string, string> = {
  video: 'var(--track-video)',
  audio: 'var(--track-audio)',
};

export function TrackHeader({ track, isSelected }: TrackHeaderProps) {
  const TypeIcon = trackTypeIcon[track.type] ?? Video;

  return (
    <div
      className={cn('tl-track-header', isSelected && 'is-selected')}
      style={{
        width: 'var(--tl-track-header-width)',
        flexShrink: 0,
        position: 'sticky',
        left: 0,
        zIndex: 2,
      }}
    >
      <GripVertical size={14} className="tl-track-header-drag" />
      <TypeIcon
        size={13}
        style={{ color: trackTypeColorVar[track.type] ?? 'var(--text-tertiary)', flexShrink: 0, opacity: 0.7 }}
      />
      <span className="tl-track-header-name" title={track.name}>{track.name}</span>
      <div className="tl-track-header-actions">
        <button
          className={cn('tl-track-header-btn', track.muted && 'is-active')}
          title="Mute (M)"
        >
          {track.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
        </button>
        <button
          className={cn('tl-track-header-btn', track.solo && 'is-active')}
          title="Solo (S)"
        >
          <Headphones size={12} />
        </button>
        <button
          className={cn('tl-track-header-btn', track.locked && 'is-active')}
          title="Lock"
        >
          {track.locked ? <Lock size={12} /> : <Unlock size={12} />}
        </button>
        <button className="tl-track-header-btn" title="Hide">
          <Eye size={12} />
        </button>
      </div>
    </div>
  );
}
