import React from 'react';
import type { Clip } from '@webpacked-timeline/core';
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

function formatFrame(frame: number, fps: number): string {
  const totalSeconds = Math.floor(frame / fps);
  const f = frame % fps;
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
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
  const showDetails = width > 60;
  const showTimecodes = width > 180;
  const clipName = clip.name || (clip.id as string).slice(0, 8);

  return (
    <div
      className={`tl-clip${isSelected ? ' is-selected' : ''}${isProvisional ? ' is-provisional' : ''}${className ? ` ${className}` : ''}`}
      data-clip-id={clip.id}
      data-track-id={trackId}
      style={{
        left: start,
        width: width,
        height: height - 16,
        top: 8,
        background: getClipColor(trackType),
        ...style,
      }}
    >
      {/* Accent strip */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: 'rgba(255,255,255,0.25)',
          borderRadius: 'var(--tl-clip-radius) var(--tl-clip-radius) 0 0',
        }}
      />

      {/* Clip content */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: '100%',
          padding: '0 12px',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {showDetails && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              borderRadius: 6,
              background: 'rgba(255,255,255,0.15)',
              flexShrink: 0,
            }}
          >
            <IconComponent size={12} style={{ color: 'rgba(255,255,255,0.9)' }} />
          </div>
        )}

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          overflow: 'hidden',
          gap: 2,
          minWidth: 0,
          flex: 1,
        }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'var(--tl-clip-text)',
              lineHeight: '1.3',
              letterSpacing: '0.01em',
            }}
          >
            {clipName}
          </span>
          {showTimecodes && (
            <span
              style={{
                fontSize: 9,
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                color: 'rgba(255,255,255,0.45)',
                lineHeight: '1.2',
                letterSpacing: '0.04em',
              }}
            >
              {formatFrame(clip.timelineStart as number, 30)} → {formatFrame(clip.timelineEnd as number, 30)}
            </span>
          )}
        </div>
      </div>

      {/* In-point handle */}
      <div className="tl-clip-handle tl-clip-handle-left">
        <div className="tl-clip-handle-grip" />
      </div>

      {/* Out-point handle */}
      <div className="tl-clip-handle tl-clip-handle-right">
        <div className="tl-clip-handle-grip" />
      </div>
    </div>
  );
});
