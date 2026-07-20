import React from 'react';
import type { Clip, Effect } from '@timelinx/core';
import { IconVideo, IconMusic, IconSubtitle } from './icons';
import { frameToTimecode } from '../shared/time';
import { getEffectColor } from '../shared/effect-colors';

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
  thumbnails?: Map<string, string>;
}

function getClipIcon(trackType?: string) {
  switch (trackType) {
    case 'audio': return IconMusic;
    case 'subtitle': return IconSubtitle;
    default: return IconVideo;
  }
}

const EFFECT_ROW_HEIGHT = 6;

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
  thumbnails,
}: TimelineClipProps) {
  const start = (clip.timelineStart as number) * ppf;
  const end = (clip.timelineEnd as number) * ppf;
  const width = end - start;
  const IconComponent = getClipIcon(trackType);
  const clipName = clip.name || (clip.id as string).slice(0, 8);

  const showName = width > 40;
  const showMeta = width > 140;
  const showIcon = width > 50;

  const effects: readonly Effect[] = clip.effects ?? [];
  const effectCount = effects.length;
  const mainHeight = effectCount > 0
    ? height - effectCount * EFFECT_ROW_HEIGHT - 2
    : height;

  const assetId = clip.assetId as string;
  const thumbnail = thumbnails?.get(assetId);

  return (
    <div
      className={`tl-clip-wrap${isSelected ? ' selected' : ''}`}
      data-clip-id={clip.id}
      data-track-id={trackId}
      style={{
        position: 'absolute',
        left: `${start}px`,
        width: `${width}px`,
        top: 0,
        height: `${height}px`,
        ...style,
      }}
    >
      {/* Trim handles at wrapper level so they span full height */}
      <div className="clip-handle clip-handle--left">
        <svg className="clip-handle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </div>
      <div className="clip-handle clip-handle--right">
        <svg className="clip-handle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {/* Main clip body */}
      <div
        className={`tl-clip tl-clip--${trackType || 'video'}${isProvisional ? ' provisional' : ''}${className ? ` ${className}` : ''}`}
        style={{ height: `${mainHeight}px` }}
      >
        {/* Filmstrip thumbnails for video clips */}
        {trackType !== 'audio' && trackType !== 'subtitle' && width > 30 && (
          <div className="clip-thumbnails">
            {thumbnail ? (
              Array.from({ length: Math.max(1, Math.floor(width / 40)) }, (_, i) => (
                <div
                  key={i}
                  className="clip-thumb-frame clip-thumb-frame--real"
                  style={{ backgroundImage: `url(${thumbnail})` }}
                />
              ))
            ) : (
              Array.from({ length: Math.max(1, Math.floor(width / 40)) }, (_, i) => (
                <div key={i} className="clip-thumb-frame" />
              ))
            )}
          </div>
        )}

        {/* Audio waveform visualization */}
        {(trackType === 'audio' || isAudio) && (
          <div className="clip-waveform" />
        )}

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
      </div>

      {/* Effect sub-rows */}
      {effects.map((effect) => {
        const color = getEffectColor(effect.effectType);
        return (
          <div
            key={effect.id}
            className={`clip-effect-row${effect.enabled ? '' : ' disabled'}`}
            style={{
              height: `${EFFECT_ROW_HEIGHT}px`,
              background: color,
              opacity: effect.enabled ? 0.7 : 0.25,
            }}
            title={`${effect.effectType}${effect.enabled ? '' : ' (disabled)'}`}
          />
        );
      })}
    </div>
  );
});
