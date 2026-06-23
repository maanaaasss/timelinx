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

/**
 * Generate a deterministic pseudo-random number from a string seed.
 * Used for generating consistent thumbnail patterns per clip.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Generate thumbnail strip background for video clips.
 * Creates a pattern of vertical "frames" with varying brightness.
 */
function generateThumbnailStyle(clipId: string, width: number, height: number): React.CSSProperties {
  const seed = hashString(clipId as string);
  const frameCount = Math.max(3, Math.floor(width / 40));

  // Generate frame brightness values
  const frames: string[] = [];
  for (let i = 0; i < frameCount; i++) {
    const hue = ((seed + i * 37) % 60) + 200; // Blue-ish hue range
    const lightness = 25 + ((seed + i * 13) % 15); // 25-40% lightness
    frames.push(`hsl(${hue}, 40%, ${lightness}%)`);
  }

  // Create a repeating gradient that simulates thumbnail frames
  const frameWidth = 100 / frameCount;
  const gradientStops = frames.map((color, i) => {
    const start = i * frameWidth;
    const end = (i + 1) * frameWidth;
    return `${color} ${start}%, ${color} ${end}%`;
  }).join(', ');

  return {
    background: `linear-gradient(90deg, ${gradientStops})`,
  };
}

/**
 * Generate waveform-like pattern for audio clips.
 */
function generateWaveformStyle(clipId: string, width: number, height: number): React.CSSProperties {
  const seed = hashString(clipId as string);
  const barCount = Math.max(5, Math.floor(width / 6));

  // Create a repeating gradient that simulates waveform bars
  const bars: string[] = [];
  for (let i = 0; i < barCount; i++) {
    const amplitude = 30 + ((seed + i * 17) % 40); // 30-70% amplitude
    const barWidth = 100 / barCount;
    const center = 50;
    const barTop = center - amplitude / 2;
    const barBottom = center + amplitude / 2;

    bars.push(`transparent ${barTop}%`);
    bars.push(`rgba(255,255,255,0.15) ${barTop}%`);
    bars.push(`rgba(255,255,255,0.15) ${barBottom}%`);
    bars.push(`transparent ${barBottom}%`);
  }

  return {
    background: `linear-gradient(180deg, ${bars.join(', ')})`,
  };
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
  const showThumbnails = trackType === 'video' && width > 60;
  const showWaveform = isAudio && width > 40;

  // Generate thumbnail/waveform styles
  const thumbnailStyle = showThumbnails ? generateThumbnailStyle(clip.id as string, width, height) : {};
  const waveformStyle = showWaveform ? generateWaveformStyle(clip.id as string, width, height) : {};

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
      {/* Thumbnail strip for video clips */}
      {showThumbnails && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            ...thumbnailStyle,
            opacity: 0.6,
            borderRadius: 'var(--tl-clip-radius)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Waveform for audio clips */}
      {showWaveform && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            ...waveformStyle,
            borderRadius: 'var(--tl-clip-radius)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Dark overlay for readability */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: showThumbnails
            ? 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)'
            : 'linear-gradient(to bottom, rgba(255,255,255,0.04) 0%, transparent 100%)',
          borderRadius: 'var(--tl-clip-radius)',
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
              background: showThumbnails ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.1)',
              flexShrink: 0,
            }}
          >
            <IconComponent size={11} style={{ color: 'rgba(255,255,255,0.9)' }} />
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
                textShadow: showThumbnails ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
              }}
            >
              {clipName}
            </span>
            {showMeta && (
              <span
                style={{
                  fontSize: 10,
                  fontFamily: 'var(--tl-font-mono)',
                  color: 'rgba(255,255,255,0.4)',
                  lineHeight: '1.2',
                  letterSpacing: '0.02em',
                  textShadow: showThumbnails ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
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
