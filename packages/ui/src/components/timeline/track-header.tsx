import { useCallback } from 'react';
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
  /** Current resolved height — passed through from TrackRow for context. */
  height?: number;
  /** Called by resize gesture; propagates up to TimelineLayout → engine. */
  onHeightChange?: (trackId: string, height: number) => void;
}

const trackTypeIcon: Record<string, typeof Video> = {
  video: Video,
  audio: Volume2,
};

const HEADER_ICON_SIZE = 11;
const HEADER_BTN_ICON_SIZE = 11;

export function TrackHeader({ track, engine, isSelected }: TrackHeaderProps) {
  const TypeIcon = trackTypeIcon[track.type] ?? Video;

  // Memoized so button onClick handlers don't get new function references
  // every render when unrelated state changes.
  const dispatch = useCallback(
    (label: string, op: any) => {
      engine.dispatch({
        id: crypto.randomUUID(),
        label,
        timestamp: Date.now(),
        operations: [op],
      });
    },
    [engine],
  );

  return (
    <div className={cn('tl-track-header', isSelected && 'is-selected')}>
      <GripVertical size={12} className="tl-track-header-drag" />
      <TypeIcon size={HEADER_ICON_SIZE} className="tl-track-header-type-icon" />
      <span className="tl-track-header-name" title={track.name}>
        {track.name}
      </span>
      <div className="tl-track-header-actions">
        <button
          className={cn('tl-track-header-btn', track.muted && 'is-active')}
          title="Mute (M)"
          onClick={() =>
            dispatch('Toggle mute', {
              type: 'SET_TRACK_MUTE',
              trackId: track.id,
              muted: !track.muted,
            })
          }
        >
          {track.muted ? <VolumeX size={HEADER_BTN_ICON_SIZE} /> : <Volume2 size={HEADER_BTN_ICON_SIZE} />}
        </button>
        <button
          className={cn('tl-track-header-btn', track.solo && 'is-active')}
          title="Solo (S)"
          onClick={() =>
            dispatch('Toggle solo', {
              type: 'SET_TRACK_SOLO',
              trackId: track.id,
              solo: !track.solo,
            })
          }
        >
          <Headphones size={HEADER_BTN_ICON_SIZE} />
        </button>
        <button
          className={cn('tl-track-header-btn', track.locked && 'is-active')}
          title="Lock (L)"
          onClick={() =>
            dispatch('Toggle lock', {
              type: 'SET_TRACK_LOCK',
              trackId: track.id,
              locked: !track.locked,
            })
          }
        >
          {track.locked ? <Lock size={HEADER_BTN_ICON_SIZE} /> : <Unlock size={HEADER_BTN_ICON_SIZE} />}
        </button>
        <button
          className={cn('tl-track-header-btn', (track.opacity ?? 1) === 0 && 'is-active')}
          title="Hide (H)"
          onClick={() =>
            dispatch('Toggle visibility', {
              type: 'SET_TRACK_OPACITY',
              trackId: track.id,
              opacity: (track.opacity ?? 1) === 0 ? 1 : 0,
            })
          }
        >
          {(track.opacity ?? 1) === 0 ? <EyeOff size={HEADER_BTN_ICON_SIZE} /> : <Eye size={HEADER_BTN_ICON_SIZE} />}
        </button>
      </div>
    </div>
  );
}
