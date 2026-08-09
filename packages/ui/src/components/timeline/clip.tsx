import { useRef, useCallback, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Clip as ClipType, TimelineFrame, TimelineState } from '@timelinx/core';
import type { TimelineEngine } from '@timelinx/react';
import { cn } from '../../shared/cn';

export interface ClipProps {
  clip: ClipType;
  clipType: 'video' | 'audio' | 'text';
  ppf: number;
  engine: TimelineEngine;
  isSelected?: boolean;
}

const clipBgVar: Record<string, string> = {
  video: 'var(--track-video-bg)',
  audio: 'var(--track-audio-bg)',
  text: 'var(--track-subtitle-bg)',
};

type DragMode = 'move' | 'trim-left' | 'trim-right';

const SNAP_THRESHOLD_PX = 4;
const MIN_DURATION_PX = 6;

function clampToNeighbors(
  state: TimelineState,
  clipId: string,
  newStart: number,
  duration: number,
): number {
  const track = state.timeline.tracks.find((t) =>
    t.clips.some((c) => c.id === clipId),
  );
  if (!track) return Math.max(0, newStart);
  const others = track.clips.filter((c) => c.id !== clipId);
  let minStart = 0;
  let maxStart = (state.timeline.duration as number) - duration;
  for (const other of others) {
    const otherEnd = other.timelineEnd as number;
    const otherStart = other.timelineStart as number;
    if (otherEnd <= newStart + duration && otherEnd > minStart) {
      minStart = otherEnd;
    }
    if (otherStart >= newStart && otherStart - duration < maxStart) {
      maxStart = otherStart - duration;
    }
  }
  return Math.max(minStart, Math.min(maxStart, newStart));
}

function clampEdgeToNeighbor(
  state: TimelineState,
  clipId: string,
  edge: 'start' | 'end',
  newFrame: number,
): number {
  const track = state.timeline.tracks.find((t) =>
    t.clips.some((c) => c.id === clipId),
  );
  if (!track) return Math.max(0, newFrame);
  const clip = track.clips.find((c) => c.id === clipId);
  if (!clip) return Math.max(0, newFrame);
  const others = track.clips.filter((c) => c.id !== clipId);
  if (edge === 'start') {
    let bound = 0;
    for (const other of others) {
      const otherEnd = other.timelineEnd as number;
      if (otherEnd <= (clip.timelineStart as number) && otherEnd > bound) {
        bound = otherEnd;
      }
    }
    return Math.max(bound, newFrame);
  } else {
    let bound = state.timeline.duration as number;
    for (const other of others) {
      const otherStart = other.timelineStart as number;
      if (otherStart >= (clip.timelineEnd as number) && otherStart < bound) {
        bound = otherStart;
      }
    }
    return Math.min(bound, newFrame);
  }
}

export function Clip({ clip, clipType, ppf, engine, isSelected }: ClipProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draftDelta, setDraftDelta] = useState(0);
  const [draftTrimStart, setDraftTrimStart] = useState(0);
  const [draftTrimEnd, setDraftTrimEnd] = useState(0);
  const [snapGuideX, setSnapGuideX] = useState<number | null>(null);

  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    origStart: number;
    origEnd: number;
  } | null>(null);

  function snapToFrame(frames: number): number {
    const pxFromFrame = (frames - Math.round(frames)) * ppf;
    if (Math.abs(pxFromFrame) < SNAP_THRESHOLD_PX) {
      return Math.round(frames);
    }
    return frames;
  }

  const handleMovePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        mode: 'move',
        startX: e.clientX,
        origStart: clip.timelineStart,
        origEnd: clip.timelineEnd,
      };
      setIsDragging(true);
      setDraftDelta(0);
      setSnapGuideX(null);
    },
    [clip.timelineStart, clip.timelineEnd],
  );

  const handleTrimLeftPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        mode: 'trim-left',
        startX: e.clientX,
        origStart: clip.timelineStart,
        origEnd: clip.timelineEnd,
      };
      setIsDragging(true);
      setDraftTrimStart(0);
      setSnapGuideX(null);
    },
    [clip.timelineStart, clip.timelineEnd],
  );

  const handleTrimRightPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        mode: 'trim-right',
        startX: e.clientX,
        origStart: clip.timelineStart,
        origEnd: clip.timelineEnd,
      };
      setIsDragging(true);
      setDraftTrimEnd(0);
      setSnapGuideX(null);
    },
    [clip.timelineStart, clip.timelineEnd],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = e.clientX - drag.startX;
      const dFrames = dx / ppf;

      if (drag.mode === 'move') {
        const raw = drag.origStart + dFrames;
        const snapped = snapToFrame(raw);
        const duration = drag.origEnd - drag.origStart;
        const clampedStart = clampToNeighbors(engine.getState(), clip.id, snapped, duration);
        const delta = Math.round(clampedStart - drag.origStart);
        setDraftDelta(delta);
        setSnapGuideX(Math.max(0, clampedStart) * ppf);
      } else if (drag.mode === 'trim-left') {
        const minFrames = Math.ceil(MIN_DURATION_PX / ppf);
        const maxDelta = (drag.origEnd - drag.origStart) - minFrames;
        const raw = drag.origStart + dFrames;
        const snapped = snapToFrame(raw);
        const neighborClamped = clampEdgeToNeighbor(engine.getState(), clip.id, 'start', snapped);
        const clamped = Math.min(neighborClamped - drag.origStart, maxDelta);
        setDraftTrimStart(clamped);
        setSnapGuideX(Math.max(0, drag.origStart + clamped) * ppf);
      } else if (drag.mode === 'trim-right') {
        const minFrames = Math.ceil(MIN_DURATION_PX / ppf);
        const maxDelta = (drag.origEnd - drag.origStart) - minFrames;
        const raw = drag.origEnd + dFrames;
        const snapped = snapToFrame(raw);
        const neighborClamped = clampEdgeToNeighbor(engine.getState(), clip.id, 'end', snapped);
        const clamped = Math.max(neighborClamped - drag.origEnd, -maxDelta);
        setDraftTrimEnd(clamped);
        setSnapGuideX((drag.origEnd + clamped) * ppf);
      }
    },
    [ppf],
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = e.clientX - drag.startX;
      const dFrames = dx / ppf;

      let newStart: TimelineFrame = drag.origStart as TimelineFrame;
      let newEnd: TimelineFrame = drag.origEnd as TimelineFrame;

      if (drag.mode === 'move') {
        const raw = drag.origStart + dFrames;
        const snapped = Math.max(0, snapToFrame(raw));
        const duration = drag.origEnd - drag.origStart;
        const clampedStart = clampToNeighbors(engine.getState(), clip.id, snapped, duration);
        newStart = clampedStart as TimelineFrame;
        newEnd = (clampedStart + duration) as TimelineFrame;
        engine.dispatch({
          id: crypto.randomUUID(),
          label: 'Move clip',
          timestamp: Date.now(),
          operations: [{ type: 'MOVE_CLIP', clipId: clip.id, newTimelineStart: newStart }],
        } as any);
      } else if (drag.mode === 'trim-left') {
        const minFrames = Math.ceil(MIN_DURATION_PX / ppf);
        const maxDelta = (drag.origEnd - drag.origStart) - minFrames;
        const raw = drag.origStart + dFrames;
        const snapped = snapToFrame(raw);
        const neighborClamped = clampEdgeToNeighbor(engine.getState(), clip.id, 'start', snapped);
        const clamped = Math.min(neighborClamped - drag.origStart, maxDelta);
        newStart = Math.max(0, drag.origStart + clamped) as TimelineFrame;
        engine.dispatch({
          id: crypto.randomUUID(),
          label: 'Trim clip start',
          timestamp: Date.now(),
          operations: [{ type: 'RESIZE_CLIP', clipId: clip.id, edge: 'start', newFrame: newStart }],
        } as any);
      } else if (drag.mode === 'trim-right') {
        const minFrames = Math.ceil(MIN_DURATION_PX / ppf);
        const maxDelta = (drag.origEnd - drag.origStart) - minFrames;
        const raw = drag.origEnd + dFrames;
        const snapped = snapToFrame(raw);
        const neighborClamped = clampEdgeToNeighbor(engine.getState(), clip.id, 'end', snapped);
        const clamped = Math.max(neighborClamped - drag.origEnd, -maxDelta);
        newEnd = (drag.origEnd + clamped) as TimelineFrame;
        engine.dispatch({
          id: crypto.randomUUID(),
          label: 'Trim clip end',
          timestamp: Date.now(),
          operations: [{ type: 'RESIZE_CLIP', clipId: clip.id, edge: 'end', newFrame: newEnd }],
        } as any);
      }

      dragRef.current = null;
      setIsDragging(false);
      setDraftDelta(0);
      setDraftTrimStart(0);
      setDraftTrimEnd(0);
      setSnapGuideX(null);
    },
    [ppf, clip.id, engine],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragRef.current) return;
      e.stopPropagation();
      engine.toggleClipSelection(clip.id, e.metaKey || e.ctrlKey);
    },
    [clip.id, engine],
  );

  let displayStart = clip.timelineStart;
  let displayEnd = clip.timelineEnd;

  if (isDragging && dragRef.current) {
    const drag = dragRef.current;
    if (drag.mode === 'move') {
      displayStart = (drag.origStart + draftDelta) as TimelineFrame;
      displayEnd = (drag.origEnd + draftDelta) as TimelineFrame;
    } else if (drag.mode === 'trim-left') {
      displayStart = (drag.origStart + draftTrimStart) as TimelineFrame;
    } else if (drag.mode === 'trim-right') {
      displayEnd = (drag.origEnd + draftTrimEnd) as TimelineFrame;
    }
  }

  const left = displayStart * ppf;
  const width = Math.max(MIN_DURATION_PX, (displayEnd - displayStart) * ppf);

  return (
    <>
      {isDragging && snapGuideX !== null && (
        <div className="tl-snap-guide" style={{ left: snapGuideX }} />
      )}
      <div
        className={cn('tl-v2-clip', isSelected && 'is-selected', isDragging && 'is-dragging')}
        style={{
          left,
          width,
          background: clipBgVar[clipType] ?? 'var(--bg-raised)',
        }}
        tabIndex={isSelected ? 0 : -1}
        onClick={handleClick}
        onPointerMove={isDragging ? handlePointerMove : undefined}
        onPointerUp={isDragging ? handlePointerUp : undefined}
      >
        <div
          className="tl-v2-clip-move-zone"
          onPointerDown={handleMovePointerDown}
        />
        <span className="tl-v2-clip-label">{clip.name ?? 'Untitled'}</span>
        <div
          className="tl-v2-clip-trim-handle tl-v2-clip-trim-handle--left"
          onPointerDown={handleTrimLeftPointerDown}
        />
        <div
          className="tl-v2-clip-trim-handle tl-v2-clip-trim-handle--right"
          onPointerDown={handleTrimRightPointerDown}
        />
      </div>
    </>
  );
}
