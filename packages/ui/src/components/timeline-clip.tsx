import React from 'react';
import type { Clip } from '@timelinx/core';
import { IconVideo, IconMusic, IconSubtitle } from './icons';

export interface TimelineClipProps {
  clip: Clip;
  trackId: string;
  isAudio: boolean;
  ppf: number;
  height: number;
  isSelected: boolean;
  isProvisional?: boolean;
  trackType?: string;
  className?: string;
  style?: React.CSSProperties;
}

function getClipIcon(trackType?: string) {
  switch (trackType) {
    case 'audio': return IconMusic;
    case 'subtitle': return IconSubtitle;
    default: return IconVideo;
  }
}

function getClipColor(trackType?: string) {
  switch (trackType) {
    case 'audio': return 'var(--tl-clip-audio-bg)';
    case 'subtitle': return 'var(--tl-clip-subtitle-bg)';
    default: return 'var(--tl-clip-video-bg)';
  }
}

function formatTimecode(frame: number, fps: number): string {
  const totalSeconds = Math.floor(frame / fps);
  const f = frame % fps;
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

export const TimelineClip = React.memo(function TimelineClip({
  clip,
  trackId,
  isAudio,
  ppf,
  height,
  isSelected,
  isProvisional = false,
  trackType,
  className,
  style,
}: TimelineClipProps) {
  const start = (clip.timelineStart as number) * ppf;
  const end = (clip.timelineEnd as number) * ppf;
  const width = end - start;
  const IconComponent = getClipIcon(trackType);
  const clipName = clip.name || (clip.id as string).slice(0, 8);

  // Responsive visibility
  const showName = width > 40;
  const showMeta = width > 140;
  const showIcon = width > 50;

  return (
    <div
      className={`tl-clip${isSelected ? ' is-selected' : ''}${isProvisional ? ' is-provisional' : ''}${className ? ` ${className}` : ''}`}
      data-clip-id={clip.id}
      data-track-id={trackId}
      style={{
        left: start,
        width: width,
        height: height - 20,
        top: 10,
        background: getClipColor(trackType),
        ...style,
      }}
    >
      {/* Inner highlight */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '50%',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, transparent 100%)',
          borderRadius: 'var(--tl-clip-radius) var(--tl-clip-radius) 0 0',
          pointerEvents: 'none',
        }}
      />

      {/* Clip content */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: '100%',
          padding: '0 10px',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {showIcon && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
              borderRadius: 5,
              background: 'rgba(255,255,255,0.1)',
              flexShrink: 0,
            }}
          >
            <IconComponent size={11} style={{ color: 'rgba(255,255,255,0.8)' }} />
          </div>
        )}

        {showName && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            overflow: 'hidden',
            gap: 1,
            minWidth: 0,
            flex: 1,
          }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'var(--tl-clip-text)',
                lineHeight: '1.2',
                letterSpacing: '-0.01em',
              }}
            >
              {clipName}
            </span>
            {showMeta && (
              <span
                style={{
                  fontSize: 10,
                  fontFamily: 'var(--tl-font-mono)',
                  color: 'rgba(255,255,255,0.35)',
                  lineHeight: '1.2',
                  letterSpacing: '0.02em',
                }}
              >
                {formatTimecode(clip.timelineStart as number, 30)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Handles */}
      <div className="tl-clip-handle tl-clip-handle-left">
        <div className="tl-clip-handle-grip" />
      </div>
      <div className="tl-clip-handle tl-clip-handle-right">
        <div className="tl-clip-handle-grip" />
      </div>
    </div>
  );
});
