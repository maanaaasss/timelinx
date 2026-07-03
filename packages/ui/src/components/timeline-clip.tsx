import React from 'react';
import type { Clip } from '@timelinx/core';
import { IconVideo, IconMusic, IconSubtitle } from './icons';
import { frameToTimecode } from '../shared/time';

export interface TimelineClipProps {
  clip: Clip;
  trackId: string;
  isAudio: boolean;
  ppf: number;
  height: number;
  isSelected: boolean;
  isProvisional?: boolean;
  trackType?: string;
  fps?: number;
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

export const TimelineClip = React.memo(function TimelineClip({
  clip,
  trackId,
  isAudio,
  ppf,
  height,
  isSelected,
  isProvisional = false,
  trackType,
  fps = 30,
  className,
  style,
}: TimelineClipProps) {
  const start = (clip.timelineStart as number) * ppf;
  const end = (clip.timelineEnd as number) * ppf;
  const width = end - start;
  const IconComponent = getClipIcon(trackType);
  const clipName = clip.name || (clip.id as string).slice(0, 8);

  const showName = width > 40;
  const showMeta = width > 140;
  const showIcon = width > 50;

  return (
    <div
      className={`tl-clip tl-clip--${trackType || 'video'} ${isSelected ? 'selected' : ''}${isProvisional ? ' provisional' : ''}${className ? ` ${className}` : ''}`}
      data-clip-id={clip.id}
      data-track-id={trackId}
      style={{
        left: `${start}px`,
        width: `${width}px`,
        ...style,
      }}
    >
      <div className="clip-handle clip-handle--left" />
      {showIcon && (
        <span className="clip-type-icon">
          <IconComponent size={10} />
        </span>
      )}
      <div className="clip-info">
        {showName && <span className="clip-name">{clipName}</span>}
        {showMeta && (
          <span className="clip-timecode">
            {frameToTimecode(clip.timelineStart as number, fps)}
          </span>
        )}
      </div>
      <div className="clip-handle clip-handle--right" />
    </div>
  );
});
