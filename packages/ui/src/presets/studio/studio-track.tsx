/**
 * StudioTrack — broadcast-noir track label.
 *
 * Utilitarian design: monospace track IDs, compact controls,
 * sharp geometry, no decorative elements.
 */
import React, { useState } from 'react';
import { useTrackWithEngine } from '@webpacked-timeline/react';
import { useTimelineContext } from '../../context/timeline-context';
import {
  IconLock,
  IconLockOpen,
  IconEye,
  IconEyeOff,
  IconX,
  IconPlus,
  IconHeadphones,
  IconVolumeOff,
} from './icons';

const iconBtnBase: React.CSSProperties = {
  width: 16,
  height: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 0,
  cursor: 'pointer',
  padding: 0,
  border: 'none',
  background: 'transparent',
  lineHeight: 1,
};

export interface StudioTrackProps {
  trackId: string;
  shortId: string;
  height: number;
  clipCount: number;
  onDelete: (trackId: string) => void;
  onAddClip: (trackId: string) => void;
}

export const StudioTrack = React.memo(function StudioTrack({
  trackId,
  shortId,
  height,
  clipCount,
  onDelete,
  onAddClip,
}: StudioTrackProps) {
  const { engine } = useTimelineContext();
  const track = useTrackWithEngine(engine, trackId);
  const [soloActive, setSoloActive] = useState(false);
  const [muteActive, setMuteActive] = useState(false);
  const [lockActive, setLockActive] = useState(false);
  const [visActive, setVisActive] = useState(true);
  const [deleteHovered, setDeleteHovered] = useState(false);
  const [addHovered, setAddHovered] = useState(false);

  if (!track) return null;

  const isAudio = track.type === 'audio';
  const typeVar =
    track.type === 'video'
      ? 'var(--tl-type-video)'
      : track.type === 'audio'
        ? 'var(--tl-type-audio)'
        : track.type === 'subtitle'
          ? 'var(--tl-type-subtitle)'
          : 'var(--tl-type-title)';

  return (
    <div
      data-track-id={trackId}
      style={{
        height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: 'var(--tl-label-bg)',
        borderBottom: '1px solid var(--tl-label-border)',
        borderRight: '1px solid var(--tl-label-border)',
        overflow: 'hidden',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {/* Type color indicator — left edge, 2px wide */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 2,
        height: '100%',
        background: typeVar,
      }} />

      {/* Row 1: track ID + name + lock/visibility */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 6px 0 8px' }}>
        <span
          style={{
            fontSize: 10,
            fontFamily: 'var(--tl-font-mono)',
            fontWeight: 700,
            color: typeVar,
            background: 'var(--tl-track-badge-bg)',
            padding: '1px 5px',
            borderRadius: 0,
            flexShrink: 0,
            letterSpacing: '0.04em',
          }}
        >
          {shortId}
        </span>
        <span
          style={{
            flex: 1,
            fontSize: 11,
            fontFamily: 'var(--tl-font-ui)',
            fontWeight: 500,
            color: 'var(--tl-label-text)',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {track.name ?? shortId}
        </span>
        <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <button
            onClick={() => setLockActive(!lockActive)}
            aria-pressed={lockActive}
            aria-label={lockActive ? 'Unlock track' : 'Lock track'}
            style={{
              ...iconBtnBase,
              color: lockActive ? 'var(--tl-btn-text-active)' : 'var(--tl-label-text)',
              background: lockActive ? 'var(--tl-track-toggle-active-bg)' : 'transparent',
            }}
          >
            {lockActive ? <IconLock size={11} /> : <IconLockOpen size={11} />}
          </button>
          <button
            onClick={() => setVisActive(!visActive)}
            aria-pressed={visActive}
            aria-label={visActive ? 'Hide track' : 'Show track'}
            style={{
              ...iconBtnBase,
              color: visActive ? 'var(--tl-label-text)' : 'var(--tl-track-vis-inactive)',
              background: !visActive ? 'var(--tl-track-toggle-active-bg)' : 'transparent',
            }}
          >
            {visActive ? <IconEye size={11} /> : <IconEyeOff size={11} />}
          </button>
        </div>
      </div>

      {/* Delete track — top-right corner */}
      <button
        onClick={(ev) => { ev.stopPropagation(); onDelete(trackId); }}
        onMouseEnter={() => setDeleteHovered(true)}
        onMouseLeave={() => setDeleteHovered(false)}
        aria-label="Delete track"
        style={{
          ...iconBtnBase,
          position: 'absolute',
          top: 2,
          right: 6,
          color: deleteHovered ? '#fff' : 'var(--tl-label-text-dim)',
          background: deleteHovered ? 'var(--tl-track-delete-hover)' : 'transparent',
        }}
      >
        <IconX size={11} />
      </button>

      {/* Row 2: clip count + add clip + solo/mute */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '1px 6px 0 8px', gap: 4 }}>
        <span style={{
          fontSize: 10,
          fontFamily: 'var(--tl-font-mono)',
          color: 'var(--tl-label-text-dim)',
          letterSpacing: '0.02em',
        }}>
          {clipCount} clip{clipCount !== 1 ? 's' : ''}
        </span>
        <button
          onClick={(ev) => { ev.stopPropagation(); onAddClip(trackId); }}
          onMouseEnter={() => setAddHovered(true)}
          onMouseLeave={() => setAddHovered(false)}
          aria-label="Add clip to this track"
          style={{
            ...iconBtnBase,
            width: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            fontSize: 9,
            color: addHovered ? 'var(--tl-track-add-hover)' : 'var(--tl-track-add-text)',
            padding: '0 3px',
          }}
        >
          <IconPlus size={9} />
          <span>clip</span>
        </button>
        <div style={{ flex: 1 }} />
        {isAudio && (
          <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            <button
              onClick={() => setSoloActive(!soloActive)}
              aria-pressed={soloActive}
              aria-label="Solo"
              style={{
                ...iconBtnBase,
                width: 20,
                height: 16,
                color: soloActive ? 'var(--tl-track-solo-active-text)' : 'var(--tl-label-text)',
                background: soloActive ? 'var(--tl-solo-active)' : 'var(--tl-track-badge-bg)',
                borderRadius: 0,
              }}
            >
              <IconHeadphones size={10} />
            </button>
            <button
              onClick={() => setMuteActive(!muteActive)}
              aria-pressed={muteActive}
              aria-label="Mute"
              style={{
                ...iconBtnBase,
                width: 20,
                height: 16,
                color: muteActive ? 'var(--tl-track-mute-active-text)' : 'var(--tl-label-text)',
                background: muteActive ? 'var(--tl-mute-active)' : 'var(--tl-track-badge-bg)',
                borderRadius: 0,
              }}
            >
              <IconVolumeOff size={10} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
