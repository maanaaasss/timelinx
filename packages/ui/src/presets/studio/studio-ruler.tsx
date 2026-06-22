/**
 * StudioRuler — broadcast-precision timecode ruler.
 *
 * Sharp monospace timecodes, angular tick marks, warm amber accent.
 * The ruler has a subtle gradient fade on the left edge for depth.
 */
import React, { useMemo, useCallback } from 'react';
import {
  usePlayheadFrame,
  useTimelineWithEngine,
  useMarkers,
} from '@webpacked-timeline/react';
import { toFrame, toMarkerId } from '@webpacked-timeline/core';
import { useTimelineContext } from '../../context/timeline-context';
import { frameToTimecode, rulerTickInterval } from '../../shared/time';

let _rulerTxSeq = 0;
const txId = () => `ruler-tx-${++_rulerTxSeq}`;

export interface StudioRulerProps {
  contentRef?: React.RefObject<HTMLDivElement>;
}

export const StudioRuler = React.memo(function StudioRuler({ contentRef }: StudioRulerProps) {
  const { engine, ppf, scrollLeft, vpWidth, labelWidth, rulerHeight } = useTimelineContext();
  const frame = usePlayheadFrame(engine);
  const timeline = useTimelineWithEngine(engine);
  const markers = useMarkers(engine);

  const fps = timeline.fps as number;
  const durationFrames = timeline.duration as number;
  const timelineWidth = durationFrames * ppf;

  const timecode = useMemo(
    () => frameToTimecode(frame as number, fps),
    [frame, fps],
  );

  const rulerTicks = useMemo(() => {
    const startF = Math.floor(scrollLeft / ppf);
    const endF = startF + Math.ceil(vpWidth / ppf) + 1;
    const { major, minor } = rulerTickInterval(ppf, fps);

    const ticks: Array<{ frame: number; isMajor: boolean; x: number }> = [];
    const first = Math.floor(startF / minor) * minor;
    for (let f = first; f <= endF; f += minor) {
      ticks.push({ frame: f, isMajor: f % major === 0, x: f * ppf });
    }
    return ticks;
  }, [scrollLeft, ppf, vpWidth, fps]);

  const [, forceUpdate] = React.useState(0);
  const triggerUpdate = useCallback(() => forceUpdate((n) => n + 1), []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + (contentRef?.current?.scrollLeft ?? 0);
      const f = Math.max(0, Math.round(x / ppf));

      if (e.altKey) {
        engine.dispatch({
          id: txId(),
          label: 'Add Marker',
          timestamp: Date.now(),
          operations: [
            {
              type: 'ADD_MARKER',
              marker: {
                type: 'point',
                id: toMarkerId(`marker-${Date.now()}`),
                frame: toFrame(f),
                label: `M ${f}`,
                color: 'var(--tl-snap-color)',
                scope: 'global',
                linkedClipId: null,
              },
            },
          ] as any,
        });
        triggerUpdate();
      } else {
        engine.seekTo(toFrame(f));
        triggerUpdate();
      }
    },
    [engine, ppf, contentRef, triggerUpdate],
  );

  return (
    <div
      style={{
        display: 'flex',
        height: rulerHeight,
        flexShrink: 0,
        background: 'var(--tl-ruler-bg)',
      }}
    >
      {/* ── Timecode (left, label-width) ── */}
      <div
        style={{
          width: labelWidth,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 14,
          background: 'var(--tl-label-bg)',
          borderRight: '1px solid var(--tl-separator)',
          borderBottom: '1px solid var(--tl-track-border)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--tl-font-mono)',
            fontSize: 'var(--tl-timecode-size)',
            color: 'var(--tl-timecode-color)',
            letterSpacing: '0.06em',
            fontWeight: 500,
          }}
        >
          {timecode}
        </span>
      </div>

      {/* ── Ruler ticks ── */}
      <div
        ref={contentRef as React.RefObject<HTMLDivElement>}
        role="slider"
        aria-label="Timeline ruler — click to seek, Alt+click to add marker"
        aria-valuemin={0}
        aria-valuemax={durationFrames}
        aria-valuenow={frame as number}
        tabIndex={0}
        style={{
          flex: 1,
          position: 'relative',
          overflowX: 'hidden',
          overflowY: 'hidden',
          cursor: 'crosshair',
          borderBottom: '1px solid var(--tl-track-border)',
          background: 'linear-gradient(90deg, rgba(10,10,12,0.6) 0%, transparent 24px)',
        }}
        onClick={handleClick}
      >
        <div style={{ width: Math.max(timelineWidth, vpWidth), height: '100%', position: 'relative' }}>
          {rulerTicks.map((tick) => (
            <div
              key={tick.frame}
              style={{
                position: 'absolute',
                left: tick.x,
                top: 0,
                bottom: 0,
                width: 1,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: 1,
                  height: tick.isMajor ? 12 : 5,
                  background: tick.isMajor ? 'var(--tl-ruler-tick-maj)' : 'var(--tl-ruler-tick)',
                }}
              />
              {tick.isMajor && tick.x > 4 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: 5,
                    fontSize: 9,
                    fontFamily: 'var(--tl-font-mono)',
                    color: 'var(--tl-ruler-text)',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    letterSpacing: '0.03em',
                  }}
                >
                  {frameToTimecode(tick.frame, fps)}
                </span>
              )}
            </div>
          ))}

          {/* Marker diamonds */}
          {markers.map((m) => {
            if (m.type !== 'point') return null;
            const mx = (m.frame as number) * ppf;
            return (
              <div
                key={m.id as string}
                title={m.label}
                style={{
                  position: 'absolute',
                  left: mx - 4,
                  bottom: 0,
                  width: 8,
                  height: 8,
                  background: m.color ?? 'var(--tl-snap-color)',
                  transform: 'rotate(45deg)',
                  pointerEvents: 'none',
                  zIndex: 6,
                }}
              />
            );
          })}

          {/* Playhead triangle — angular chevron */}
          <div
            style={{
              position: 'absolute',
              left: (frame as number) * ppf - 6,
              bottom: 0,
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '7px solid var(--tl-playhead-color)',
              pointerEvents: 'none',
              zIndex: 7,
              filter: 'drop-shadow(0 0 4px rgba(212, 168, 74, 0.3))',
            }}
          />
        </div>
      </div>
    </div>
  );
});
