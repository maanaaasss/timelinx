import type { Track } from '@timelinx/core';
import type { TimelineEngine } from '@timelinx/react';
import { cn } from '../../shared/cn';
import {
  GripVertical,
  Video,
  Volume2,
  VolumeX,
  Headphones,
  Lock,
  Unlock,
  Eye,
  EyeOff,
} from 'lucide-react';

export interface TrackHeaderProps {
  track: Track;
  engine: TimelineEngine;
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

export function TrackHeader({ track, engine, isSelected }: TrackHeaderProps) {
  const TypeIcon = trackTypeIcon[track.type] ?? Video;

  const dispatch = (label: string, op: any) => {
    engine.dispatch({
      id: crypto.randomUUID(),
      label,
      timestamp: Date.now(),
      operations: [op],
    });
  };

  return (
    <div
      className={cn('tl-track-header', isSelected && 'is-selected')}
      style={{
        width: 'var(--track-header-width)',
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
          onClick={() => dispatch('Toggle mute', { type: 'SET_TRACK_MUTE', trackId: track.id, muted: !track.muted })}
        >
          {track.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
        </button>
        <button
          className={cn('tl-track-header-btn', track.solo && 'is-active')}
          title="Solo (S)"
          onClick={() => dispatch('Toggle solo', { type: 'SET_TRACK_SOLO', trackId: track.id, solo: !track.solo })}
        >
          <Headphones size={12} />
        </button>
        <button
          className={cn('tl-track-header-btn', track.locked && 'is-active')}
          title="Lock (L)"
          onClick={() => dispatch('Toggle lock', { type: 'SET_TRACK_LOCK', trackId: track.id, locked: !track.locked })}
        >
          {track.locked ? <Lock size={12} /> : <Unlock size={12} />}
        </button>
        <button
          className={cn('tl-track-header-btn', (track.opacity ?? 1) === 0 && 'is-active')}
          title="Hide (H)"
          onClick={() => dispatch('Toggle visibility', { type: 'SET_TRACK_OPACITY', trackId: track.id, opacity: (track.opacity ?? 1) === 0 ? 1 : 0 })}
        >
          {(track.opacity ?? 1) === 0 ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
      </div>
    </div>
  );
}
