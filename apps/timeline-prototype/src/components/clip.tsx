import { useRef, useCallback, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Clip as ClipType, TimelineFrame } from '@timelinx/core';
import { cn } from '../lib/cn';
import type { ClipType as ClipKind } from '../mocks/timeline-data';

export interface ClipProps {
  clip: ClipType;
  clipType: ClipKind;
  ppf: number;
  fps: number;
  isSelected?: boolean;
  onSelect?: (clipId: string, additive: boolean) => void;
  onUpdate?: (clipId: string, start: TimelineFrame, end: TimelineFrame) => void;
}

const clipBgVar: Record<ClipKind, string> = {
  video: 'var(--clip-bg-video)',
  audio: 'var(--clip-bg-audio)',
  text: 'var(--clip-bg-text)',
};

type DragMode = 'move' | 'trim-left' | 'trim-right';

const SNAP_THRESHOLD_PX = 4;
const MIN_DURATION_PX = 6;

export function Clip({
  clip,
  clipType,
  ppf,
  fps: _fps,
  isSelected,
  onSelect,
  onUpdate,
}: ClipProps) {
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
        const maxDelta = drag.origEnd - drag.origStart - minFrames;
        const raw = drag.origStart + dFrames;
        const snapped = snapToFrame(raw);
        const clamped = Math.min(snapped - drag.origStart, maxDelta);
        setDraftTrimStart(clamped);
        setSnapGuideX(Math.max(0, drag.origStart + clamped) * ppf);
      } else if (drag.mode === 'trim-right') {
        const minFrames = Math.ceil(MIN_DURATION_PX / ppf);
        const maxDelta = drag.origEnd - drag.origStart - minFrames;
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
      } else if (drag.mode === 'trim-left') {
        const minFrames = Math.ceil(MIN_DURATION_PX / ppf);
        const maxDelta = drag.origEnd - drag.origStart - minFrames;
        const raw = drag.origStart + dFrames;
        const snapped = snapToFrame(raw);
        const clamped = Math.min(snapped - drag.origStart, maxDelta);
        newStart = Math.max(0, drag.origStart + clamped) as TimelineFrame;
      } else if (drag.mode === 'trim-right') {
        const minFrames = Math.ceil(MIN_DURATION_PX / ppf);
        const maxDelta = drag.origEnd - drag.origStart - minFrames;
        const raw = drag.origEnd + dFrames;
        const snapped = snapToFrame(raw);
        const clamped = Math.max(snapped - drag.origEnd, -maxDelta);
        newEnd = (drag.origEnd + clamped) as TimelineFrame;
      }

      dragRef.current = null;
      setIsDragging(false);
      setDraftDelta(0);
      setDraftTrimStart(0);
      setDraftTrimEnd(0);
      setSnapGuideX(null);
      onUpdate?.(clip.id, newStart, newEnd);
    },
    [ppf, clip.id, onUpdate],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragRef.current) return;
      e.stopPropagation();
      onSelect?.(clip.id, e.metaKey || e.ctrlKey);
    },
    [clip.id, onSelect],
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
        className={cn('tl-clip', isSelected && 'is-selected', isDragging && 'is-dragging')}
        style={{
          left,
          width,
          background: clipBgVar[clipType],
        }}
        tabIndex={isSelected ? 0 : -1}
        onClick={handleClick}
        onPointerMove={isDragging ? handlePointerMove : undefined}
        onPointerUp={isDragging ? handlePointerUp : undefined}
      >
        <div className="tl-clip-move-zone" onPointerDown={handleMovePointerDown} />
        <span className="tl-clip-label">{clip.name ?? 'Untitled'}</span>
        <div
          className="tl-clip-trim-handle tl-clip-trim-handle--left"
          onPointerDown={handleTrimLeftPointerDown}
        />
        <div
          className="tl-clip-trim-handle tl-clip-trim-handle--right"
          onPointerDown={handleTrimRightPointerDown}
        />
      </div>
    </>
  );
}
