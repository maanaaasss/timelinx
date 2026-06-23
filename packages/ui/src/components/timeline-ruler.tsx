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
    const height = rulerHeight || 36;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const bgColor = resolveCssVar('--tl-ruler-bg', '#12121a');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const { major, minor } = rulerTickInterval(ppf, fps);

    const startFrame = Math.max(0, Math.floor(scrollLeft / ppf));
    const endFrame = Math.min(duration, Math.ceil((scrollLeft + vpWidth) / ppf));

    const textColor = resolveCssVar('--tl-ruler-text', 'rgba(255,255,255,0.35)');
    const tickColor = resolveCssVar('--tl-ruler-tick', 'rgba(255,255,255,0.08)');
    const tickMajColor = resolveCssVar('--tl-ruler-tick-maj', 'rgba(255,255,255,0.18)');

    ctx.font = '10px "JetBrains Mono", "SF Mono", monospace';
    ctx.textBaseline = 'alphabetic';

    for (let f = startFrame; f <= endFrame; f++) {
      const isMajor = f % major === 0;
      const isMinor = f % minor === 0;

      if (!isMajor && !isMinor) continue;

      const x = f * ppf;

      ctx.beginPath();
      if (isMajor) {
        ctx.moveTo(x, height);
        ctx.lineTo(x, height - 12);
        ctx.strokeStyle = tickMajColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Adaptive label format based on zoom level
        ctx.fillStyle = textColor;
        let label: string;
        const totalSeconds = f / fps;
        
        if (ppf > 30) {
          // Very zoomed in: show frames
          label = `${f}`;
        } else if (ppf > 10) {
          // Zoomed in: show seconds + frames
          const sec = Math.floor(totalSeconds);
          const frame = f % Math.round(fps);
          label = `${sec}s ${frame}f`;
        } else if (ppf > 3) {
          // Medium zoom: show seconds
          const sec = Math.floor(totalSeconds);
          const min = Math.floor(sec / 60);
          label = min > 0 ? `${min}:${String(sec % 60).padStart(2, '0')}` : `${sec}s`;
        } else {
          // Zoomed out: show minutes
          const sec = Math.floor(totalSeconds);
          const min = Math.floor(sec / 60);
          const hr = Math.floor(min / 60);
          label = hr > 0
            ? `${hr}:${String(min % 60).padStart(2, '0')}`
            : min > 0
              ? `${min}:${String(sec % 60).padStart(2, '0')}`
              : `${sec}s`;
        }
        ctx.fillText(label, x + 4, height - 14);
      } else {
        ctx.moveTo(x, height);
        ctx.lineTo(x, height - 5);
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
