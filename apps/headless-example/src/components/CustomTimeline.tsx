/**
 * CustomTimeline — headless timeline built from scratch
 *
 * Renders tracks and clips using only @timelinx/react hooks.
 * Pointer events are forwarded to the engine's tool system.
 * This is the core of the headless approach: full control over rendering.
 */
import { useCallback, useRef } from 'react';
import {
  useTrackIds,
  useTrack,
  useClips,
  usePlayheadFrame,
  useCursor,
  useSelectedClipIds,
  useProvisional,
} from '@timelinx/react';
import type { TimelineEngine, TrackId, ClipId } from '@timelinx/react';
import { toFrame } from '@timelinx/core';
import type { TimelineFrame, TimelinePointerEvent, TimelineKeyEvent } from '@timelinx/core';
import { CustomTrack } from './CustomTrack';

const PPF = 10; // pixels per frame — the zoom level
const TRACK_HEIGHT = 80;
const TIMELINE_PADDING_LEFT = 0;

function frameToX(frame: TimelineFrame): number {
  return (frame as number) * PPF + TIMELINE_PADDING_LEFT;
}

function xToFrame(x: number): TimelineFrame {
  return Math.round((x - TIMELINE_PADDING_LEFT) / PPF) as TimelineFrame;
}

function yToTrackIndex(y: number, trackCount: number): number {
  const idx = Math.floor(y / TRACK_HEIGHT);
  return Math.max(0, Math.min(idx, trackCount - 1));
}

function formatTimecode(frame: number, fps: number): string {
  const totalSeconds = Math.floor(frame / fps);
  const f = frame % fps;
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

interface CustomTimelineProps {
  engine: TimelineEngine;
}

export function CustomTimeline({ engine }: CustomTimelineProps) {
  const trackIds = useTrackIds();
  const playheadFrame = usePlayheadFrame();
  const cursor = useCursor();
  const selectedClipIds = useSelectedClipIds();
  const provisional = useProvisional();
  const timelineRef = useRef<HTMLDivElement>(null);

  const getModifiers = useCallback((e: React.MouseEvent | React.KeyboardEvent) => ({
    shift: e.shiftKey,
    alt: e.altKey,
    ctrl: e.ctrlKey,
    meta: e.metaKey,
  }), []);

  const buildPointerEvent = useCallback((e: React.MouseEvent, trackId: TrackId | null): TimelinePointerEvent => {
    const rect = timelineRef.current?.getBoundingClientRect();
    const x = e.clientX - (rect?.left ?? 0);
    const y = e.clientY - (rect?.top ?? 0);
    return {
      frame: xToFrame(x),
      x,
      y,
      trackId,
      button: e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle',
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
    };
  }, []);

  const handlePointerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = timelineRef.current?.getBoundingClientRect();
    const y = e.clientY - (rect?.top ?? 0);
    const idx = yToTrackIndex(y, trackIds.length);
    const trackId = trackIds[idx] as TrackId | undefined;
    const trackEvent = buildPointerEvent(e, trackId ?? null);
    engine.handlePointerDown(trackEvent, getModifiers(e));
  }, [engine, trackIds, buildPointerEvent, getModifiers]);

  const handlePointerMove = useCallback((e: React.MouseEvent) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    const y = e.clientY - (rect?.top ?? 0);
    const idx = yToTrackIndex(y, trackIds.length);
    const trackId = trackIds[idx] as TrackId | undefined;
    const trackEvent = buildPointerEvent(e, trackId ?? null);
    engine.handlePointerMove(trackEvent, getModifiers(e));
  }, [engine, trackIds, buildPointerEvent, getModifiers]);

  const handlePointerUp = useCallback((e: React.MouseEvent) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    const y = e.clientY - (rect?.top ?? 0);
    const idx = yToTrackIndex(y, trackIds.length);
    const trackId = trackIds[idx] as TrackId | undefined;
    const trackEvent = buildPointerEvent(e, trackId ?? null);
    engine.handlePointerUp(trackEvent, getModifiers(e));
  }, [engine, trackIds, buildPointerEvent, getModifiers]);

  const handlePointerLeave = useCallback(() => {
    engine.handlePointerLeave({ frame: toFrame(0), x: 0, y: 0, trackId: null, button: 'left', shiftKey: false, altKey: false, ctrlKey: false, metaKey: false });
  }, [engine]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.preventDefault();
    const keyEvent: TimelineKeyEvent = {
      key: e.key,
      code: e.code,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
    };
    engine.handleKeyDown(keyEvent, getModifiers(e));
  }, [engine, getModifiers]);

  const timeline = useTrack ? engine.getState().timeline : null;
  const durationFrames = (timeline?.duration as number) ?? 900;
  const totalWidth = frameToX(toFrame(durationFrames));

  return (
    <div className="headless-timeline-wrapper">
      {/* Track labels */}
      <div className="headless-track-labels">
        {trackIds.map((id) => (
          <TrackLabel key={id} trackId={id} />
        ))}
      </div>

      {/* Main timeline area */}
      <div
        ref={timelineRef}
        className="headless-timeline-canvas"
        style={{ cursor, minWidth: totalWidth }}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Time ruler */}
        <div className="headless-ruler" style={{ width: totalWidth }}>
          {Array.from({ length: Math.ceil(durationFrames / 30) + 1 }, (_, i) => {
            const frame = i * 30;
            return (
              <div
                key={i}
                className="headless-ruler-mark"
                style={{ left: frameToX(toFrame(frame)) }}
              >
                <span className="headless-ruler-tick" />
                <span className="headless-ruler-label">
                  {formatTimecode(frame, 30)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Track rows */}
        <div className="headless-tracks">
          {trackIds.map((id, i) => (
            <CustomTrack
              key={id}
              trackId={id}
              index={i}
              ppf={PPF}
              trackHeight={TRACK_HEIGHT}
              selectedClipIds={selectedClipIds}
              provisional={provisional}
            />
          ))}
        </div>

        {/* Playhead */}
        <div
          className="headless-playhead"
          style={{ left: frameToX(playheadFrame) }}
        >
          <div className="headless-playhead-head" />
          <div className="headless-playhead-line" />
        </div>
      </div>
    </div>
  );
}

function TrackLabel({ trackId }: { trackId: string }) {
  const track = useTrack(trackId);
  if (!track) return <div className="headless-track-label" />;

  return (
    <div className="headless-track-label">
      <span className="headless-track-name">{track.name}</span>
      <span className="headless-track-type">{track.type}</span>
    </div>
  );
}
