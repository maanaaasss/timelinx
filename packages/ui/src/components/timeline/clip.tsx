import { useRef, useCallback, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Clip as ClipType, TimelineFrame } from '@timelinx/core';
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
        const delta = Math.round(snapped - drag.origStart);
        setDraftDelta(delta);
        setSnapGuideX(Math.max(0, snapped) * ppf);
      } else if (drag.mode === 'trim-left') {
        const minFrames = Math.ceil(MIN_DURATION_PX / ppf);
        const maxDelta = (drag.origEnd - drag.origStart) - minFrames;
        const raw = drag.origStart + dFrames;
        const snapped = snapToFrame(raw);
        const clamped = Math.min(snapped - drag.origStart, maxDelta);
        setDraftTrimStart(clamped);
        setSnapGuideX(Math.max(0, drag.origStart + clamped) * ppf);
      } else if (drag.mode === 'trim-right') {
        const minFrames = Math.ceil(MIN_DURATION_PX / ppf);
        const maxDelta = (drag.origEnd - drag.origStart) - minFrames;
        const raw = drag.origEnd + dFrames;
        const snapped = snapToFrame(raw);
        const clamped = Math.max(snapped - drag.origEnd, -maxDelta);
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
        newStart = snapped as TimelineFrame;
        newEnd = (snapped + (drag.origEnd - drag.origStart)) as TimelineFrame;
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
        const clamped = Math.min(snapped - drag.origStart, maxDelta);
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
        const clamped = Math.max(snapped - drag.origEnd, -maxDelta);
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
