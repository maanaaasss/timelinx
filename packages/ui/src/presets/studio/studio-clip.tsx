/**
 * StudioClip — broadcast-noir clip block.
 *
 * Sharp geometry (0px radius), flat solid fills, minimal decoration.
 * Distinctive top accent bar, monospace duration labels.
 * Waveform uses warm amber tone for audio clips.
 */
import React, { useState, useRef, useMemo, useEffect } from 'react';
import type { Clip, ProvisionalState } from '@webpacked-timeline/core';
import { IconMusic, IconFilm } from './icons';

function getDisplayClip(clip: Clip, provisional: ProvisionalState | null): Clip {
  if (!provisional?.clips) return clip;
  return provisional.clips.find((c) => c.id === clip.id) ?? clip;
}

function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h ^= h << 13;
    h ^= h >> 17;
    h ^= h << 5;
    return (h >>> 0) / 0xffffffff;
  };
}

function ClipWaveform({ clipId, width, height }: { clipId: string; width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const samples = useMemo(() => {
    const rand = seededRandom(clipId);
    const w = Math.max(1, Math.round(width));
    return Array.from({ length: w }, () => rand() * 2 - 1);
  }, [clipId, width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = Math.round(width);
    const h = height;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    const mid = h / 2;

    // Center line
    ctx.strokeStyle = 'rgba(212, 168, 74, 0.12)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(w, mid);
    ctx.stroke();

    // Waveform — warm amber
    ctx.strokeStyle = 'rgba(212, 168, 74, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      const sampleIndex = Math.floor(x / w * samples.length);
      const sample = samples[sampleIndex]!;
      const y = mid + sample * mid * 0.6;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Filled area below waveform
    ctx.fillStyle = 'rgba(212, 168, 74, 0.06)';
    ctx.lineTo(w, mid);
    ctx.lineTo(0, mid);
    ctx.closePath();
    ctx.fill();
  }, [samples, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: Math.round(width),
        height,
        pointerEvents: 'none',
        opacity: 0.8,
      }}
    />
  );
}

export interface StudioClipProps {
  clip: Clip;
  provisional: ProvisionalState | null;
  trackId: string;
  isAudio: boolean;
  ppf: number;
  height: number;
  isSelected: boolean;
  toolId: string;
  fps: number;
  startFrame: number;
  endFrame: number;
}

export const StudioClip = React.memo(function StudioClip({
  clip,
  provisional,
  trackId,
  isAudio,
  ppf,
  height,
  isSelected,
  toolId,
  fps,
  startFrame,
  endFrame,
}: StudioClipProps) {
  const [isHovered, setIsHovered] = useState(false);

  const dc = getDisplayClip(clip, provisional);
  const start = dc.timelineStart as number;
  const dur = (dc.timelineEnd as number) - start;
  const left = start * ppf;
  const width = dur * ppf;

  if (start + dur <= startFrame || start >= endFrame) return null;
  if (width < 1) return null;

  const isProvisional = !!provisional?.clips?.find((c) => c.id === clip.id);
  const showClipDetail = ppf >= 3;
  const showClipFull = ppf >= 8;
  const showDuration = ppf >= 5;
  const isThin = width < 4;
  const durationSec = (dur / fps).toFixed(1);

  return (
    <div
      data-clip-id={clip.id}
      data-track-id={trackId}
      className={`tl-clip ${isAudio ? 'tl-clip-audio' : 'tl-clip-video'}${isSelected ? ' is-selected' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'absolute',
        left,
        top: 0,
        width: Math.max(width, 2),
        height,
        background: isThin
          ? isAudio ? 'var(--tl-clip-audio-accent)' : 'var(--tl-clip-video-accent)'
          : isProvisional
            ? 'var(--tl-clip-provisional)'
            : isAudio
              ? 'var(--tl-clip-audio-bg)'
              : 'var(--tl-clip-video-bg)',
        border: isThin ? 'none' : '1px solid',
        borderColor: isSelected ? 'var(--tl-clip-border-sel)' : 'var(--tl-clip-border)',
        borderRadius: 0,
        overflow: 'hidden',
        cursor:
          toolId === 'razor'
            ? 'crosshair'
            : toolId === 'hand'
              ? 'grab'
              : 'pointer',
        userSelect: 'none',
      }}
    >
      {!isThin && (
        <>
          {/* Top accent bar — thin colored strip */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: isAudio ? 'var(--tl-clip-audio-accent)' : 'var(--tl-clip-video-accent)',
              pointerEvents: 'none',
              opacity: isSelected ? 1 : 0.7,
            }}
          />

          {/* Clip label */}
          {showClipDetail && width > 30 && (
            <span
              style={{
                position: 'absolute',
                bottom: 4,
                left: 6,
                maxWidth: '75%',
                fontSize: 10,
                fontFamily: 'var(--tl-font-ui)',
                fontWeight: 500,
                color: isAudio ? 'var(--tl-clip-audio-text)' : 'var(--tl-clip-video-text)',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                pointerEvents: 'none',
              }}
            >
              {clip.name ?? clip.id}
            </span>
          )}

          {/* Type icon — bottom-left */}
          {showClipFull && width > 80 && (
            <span
              style={{
                position: 'absolute',
                bottom: 2,
                left: 4,
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
                color: 'var(--tl-clip-text-dim)',
                opacity: 0.6,
              }}
            >
              {isAudio ? <IconMusic size={9} /> : <IconFilm size={9} />}
            </span>
          )}

          {/* Duration label — bottom-right, monospace */}
          {showDuration && width > 60 && (
            <span
              style={{
                position: 'absolute',
                bottom: 2,
                right: 4,
                fontSize: 9,
                fontFamily: 'var(--tl-font-mono)',
                color: 'var(--tl-clip-text-dim)',
                pointerEvents: 'none',
                letterSpacing: '0.02em',
              }}
            >
              {durationSec}s
            </span>
          )}

          {/* Audio waveform — warm amber */}
          {isAudio && width > 40 && (
            <ClipWaveform clipId={clip.id as string} width={width - 2} height={height} />
          )}

          {/* Trim handles — sharp vertical bars on hover */}
          {showClipFull && isHovered && (
            <>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: 3,
                  height: '100%',
                  background: 'var(--tl-clip-trim)',
                  cursor: 'ew-resize',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  width: 3,
                  height: '100%',
                  background: 'var(--tl-clip-trim)',
                  cursor: 'ew-resize',
                  pointerEvents: 'none',
                }}
              />
            </>
          )}
        </>
      )}
    </div>
  );
});
