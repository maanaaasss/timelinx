import React, { useMemo } from 'react';
import { useTimelineWithEngine, usePlayheadFrame } from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';
import { rulerTickInterval } from '../shared/time';
import { toFrame } from '@timelinx/core';

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
  const timeline = useTimelineWithEngine(engine);
  const playheadFrame = usePlayheadFrame(engine);
  const fps = (timeline.fps as number) || 30;
  const duration = (timeline.duration as number) || 9000;
  const height = rulerHeight || 28;

  const { major, minor } = rulerTickInterval(ppf, fps);

  const startFrame = Math.max(0, Math.floor(scrollLeft / ppf));
  const endFrame = Math.min(duration, Math.ceil((scrollLeft + vpWidth) / ppf));

  const ticks = useMemo(() => {
    const result: { x: number; isMajor: boolean; label?: string }[] = [];

    for (let f = startFrame; f <= endFrame; f++) {
      const isMajor = f % major === 0;
      const isMinor = f % minor === 0;
      if (!isMajor && !isMinor) continue;

      const x = f * ppf;
      let label: string | undefined;

      if (isMajor) {
        const totalSeconds = f / fps;
        if (ppf > 20) {
          label = `${f}`;
        } else if (ppf > 5) {
          label = `${Math.floor(totalSeconds)}s`;
        } else if (ppf > 1.5) {
          const sec = Math.floor(totalSeconds);
          const min = Math.floor(sec / 60);
          const s = sec % 60;
          label = min > 0 ? `${min}:${String(s).padStart(2, '0')}` : `${sec}s`;
        } else {
          const sec = Math.floor(totalSeconds);
          const min = Math.floor(sec / 60);
          const s = sec % 60;
          const hr = Math.floor(min / 60);
          label = hr > 0
            ? `${hr}:${String(min % 60).padStart(2, '0')}`
            : `${min}:${String(s).padStart(2, '0')}`;
        }
      }

      result.push({ x, isMajor, label });
    }
    return result;
  }, [startFrame, endFrame, ppf, fps, major, minor]);

  const handlePointer = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const frame = Math.max(0, Math.min(duration - 1, Math.round(x / ppf)));
    engine.seekTo(toFrame(frame));
  };

  const currentTimecode = useMemo(() => {
    const totalSeconds = Math.floor((playheadFrame as number) / fps);
    const f = Math.round((playheadFrame as number) % fps);
    const s = totalSeconds % 60;
    const m = Math.floor(totalSeconds / 60) % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(m)}:${pad(s)}:${pad(f)}`;
  }, [playheadFrame, fps]);

  return (
    <div
      className={`timeline-ruler${className ? ` ${className}` : ''}`}
      style={{
        width: totalWidth,
        height,
        position: 'sticky',
        top: 0,
        zIndex: 25,
        cursor: 'ew-resize',
        ...style,
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        handlePointer(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons & 1) handlePointer(e);
      }}
    >
      {/* Current timecode at playhead position */}
      <div
        style={{
          position: 'absolute',
          left: (playheadFrame as number) * ppf,
          top: 0,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 8,
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            background: 'var(--bg-panel)',
            padding: '1px 4px',
            borderRadius: 2,
          }}
        >
          {currentTimecode}
        </span>
      </div>
      {ticks.map((tick, i) => (
        <React.Fragment key={i}>
          <div
            style={{
              position: 'absolute',
              left: tick.x,
              bottom: 0,
              width: 1,
              height: tick.isMajor ? 8 : 4,
              background: tick.isMajor
                ? 'var(--border-default)'
                : 'var(--border-faint)',
            }}
          />
          {tick.label && (
            <span
              style={{
                position: 'absolute',
                left: tick.x + 5,
                bottom: height - 12,
                fontSize: 9,
                fontWeight: 500,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-tertiary)',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              {tick.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
});
