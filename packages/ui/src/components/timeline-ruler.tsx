import React, { useEffect, useRef } from 'react';
import { useTimelineWithEngine } from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';
import { rulerTickInterval } from '../shared/time';
import { toFrame } from '@timelinx/core';

function resolveCssVar(varName: string, fallback: string): string {
  try {
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return val || fallback;
  } catch {
    return fallback;
  }
}

export interface TimelineRulerProps {
  totalWidth: number;
  className?: string;
  style?: React.CSSProperties;
}

export const TimelineRuler = React.memo(function TimelineRuler({
  totalWidth,
  className,
  style,
}: TimelineRulerProps) {
  const { engine, ppf, scrollLeft, vpWidth, rulerHeight } = useTimelineContext();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const timeline = useTimelineWithEngine(engine);
  const fps = (timeline.fps as number) || 30;
  const duration = (timeline.duration as number) || 9000;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = totalWidth;
    const height = rulerHeight || 32;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const bgColor = resolveCssVar('--tl-ruler-bg', '#111113');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const { major, minor } = rulerTickInterval(ppf, fps);

    const startFrame = Math.max(0, Math.floor(scrollLeft / ppf));
    const endFrame = Math.min(duration, Math.ceil((scrollLeft + vpWidth) / ppf));

    const textColor = resolveCssVar('--tl-ruler-text', 'rgba(255,255,255,0.2)');
    const tickColor = resolveCssVar('--tl-ruler-tick', 'rgba(255,255,255,0.04)');
    const tickMajColor = resolveCssVar('--tl-ruler-tick-maj', 'rgba(255,255,255,0.1)');

    // Elegant font: medium weight, clean
    ctx.font = '500 10px "Inter", "SF Pro Display", -apple-system, sans-serif';
    ctx.textBaseline = 'alphabetic';

    for (let f = startFrame; f <= endFrame; f++) {
      const isMajor = f % major === 0;
      const isMinor = f % minor === 0;

      if (!isMajor && !isMinor) continue;

      const x = f * ppf;

      if (isMajor) {
        // Major tick
        ctx.beginPath();
        ctx.moveTo(x, height);
        ctx.lineTo(x, height - 10);
        ctx.strokeStyle = tickMajColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label — elegant, simple
        ctx.fillStyle = textColor;
        const totalSeconds = f / fps;
        let label: string;

        // Clean format: "0s", "5s", "10s", "1:00", "2:30"
        if (ppf > 20) {
          // Very zoomed in: show frames
          label = `${f}`;
        } else if (ppf > 5) {
          // Zoomed in: "0s", "1s", "2s"
          const sec = Math.floor(totalSeconds);
          label = `${sec}s`;
        } else if (ppf > 1.5) {
          // Medium: "0:05", "0:10", "0:30"
          const sec = Math.floor(totalSeconds);
          const min = Math.floor(sec / 60);
          const s = sec % 60;
          label = min > 0
            ? `${min}:${String(s).padStart(2, '0')}`
            : `${sec}s`;
        } else {
          // Zoomed out: "1:00", "2:30"
          const sec = Math.floor(totalSeconds);
          const min = Math.floor(sec / 60);
          const s = sec % 60;
          const hr = Math.floor(min / 60);
          if (hr > 0) {
            label = `${hr}:${String(min % 60).padStart(2, '0')}`;
          } else {
            label = `${min}:${String(s).padStart(2, '0')}`;
          }
        }

        ctx.fillText(label, x + 5, height - 12);
      } else {
        // Minor tick — very subtle
        ctx.beginPath();
        ctx.moveTo(x, height);
        ctx.lineTo(x, height - 4);
        ctx.strokeStyle = tickColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }, [ppf, scrollLeft, vpWidth, rulerHeight, fps, duration, totalWidth]);

  const handlePointer = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const frame = Math.max(0, Math.min(duration - 1, Math.round(x / ppf)));
    engine.seekTo(toFrame(frame));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    handlePointer(e);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.buttons & 1) {
      handlePointer(e);
    }
  };

  return (
    <div
      className={`tl-ruler-content${className ? ` ${className}` : ''}`}
      style={{
        width: totalWidth,
        height: '100%',
        position: 'relative',
        cursor: 'ew-resize',
        ...style,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
});
