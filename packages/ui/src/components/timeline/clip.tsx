import {
  useRef,
  useCallback,
  useState,
  useEffect,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { Clip as ClipType, TimelineFrame, TimelineState, Transition } from '@timelinx/core';
import { useActiveToolId } from '@timelinx/react';
import type { TimelineEngine } from '@timelinx/react';
import { cn } from '../../shared/cn';

export interface ClipProps {
  clip: ClipType;
  clipType: 'video' | 'audio' | 'text';
  ppf: number;
  engine: TimelineEngine;
  isSelected?: boolean;
  nextClip?: ClipType | null;
}

const clipBgVar: Record<string, string> = {
  video: 'var(--track-video-bg)',
  audio: 'var(--track-audio-bg)',
  text: 'var(--track-subtitle-bg)',
};

type DragMode = 'move' | 'trim-left' | 'trim-right' | 'transition';

const SNAP_THRESHOLD_PX = 4;
const MIN_DURATION_PX = 6;
const TRANSITION_HANDLE_WIDTH = 4;

function clampToNeighbors(
  state: TimelineState,
  clipId: string,
  newStart: number,
  duration: number,
): number {
  const track = state.timeline.tracks.find((t) => t.clips.some((c) => c.id === clipId));
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
  const track = state.timeline.tracks.find((t) => t.clips.some((c) => c.id === clipId));
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

export function Clip({ clip, clipType, ppf, engine, isSelected, nextClip }: ClipProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draftDelta, setDraftDelta] = useState(0);
  const [draftTrimStart, setDraftTrimStart] = useState(0);
  const [draftTrimEnd, setDraftTrimEnd] = useState(0);
  const [snapGuideX, setSnapGuideX] = useState<number | null>(null);
  const [razorHoverFrame, setRazorHoverFrame] = useState<number | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isTransitionDragging, setIsTransitionDragging] = useState(false);
  const [transitionDraftDuration, setTransitionDraftDuration] = useState(0);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);

  const activeToolId = useActiveToolId(engine);
  const isRazorMode = activeToolId === 'razor';
  const isSelectionTool = activeToolId === 'selection' || activeToolId === 'select';

  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    origStart: number;
    origEnd: number;
    nextClipStart?: number;
    existingTransition?: Transition | null;
  } | null>(null);

  const isAdjacentToNext = nextClip && Math.abs(clip.timelineEnd - nextClip.timelineStart) < 1;

  const existingTransition = clip.transition;

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

  const handleTransitionPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (!isAdjacentToNext || !isSelectionTool) return;
      e.stopPropagation();
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const clipADuration = clip.timelineEnd - clip.timelineStart;
      const clipBDuration = nextClip ? nextClip.timelineEnd - nextClip.timelineStart : 0;
      const maxTransitionDuration = Math.floor(Math.min(clipADuration, clipBDuration) * 0.5);

      dragRef.current = {
        mode: 'transition',
        startX: e.clientX,
        origStart: clip.timelineStart,
        origEnd: clip.timelineEnd,
        nextClipStart: nextClip?.timelineStart,
        existingTransition: existingTransition,
      };
      setIsTransitionDragging(true);
      setTransitionDraftDuration(existingTransition?.durationFrames ?? 0);
    },
    [isAdjacentToNext, isSelectionTool, clip, nextClip, existingTransition],
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
        const maxDelta = drag.origEnd - drag.origStart - minFrames;
        const raw = drag.origStart + dFrames;
        const snapped = snapToFrame(raw);
        const neighborClamped = clampEdgeToNeighbor(engine.getState(), clip.id, 'start', snapped);
        const clamped = Math.min(neighborClamped - drag.origStart, maxDelta);
        setDraftTrimStart(clamped);
        setSnapGuideX(Math.max(0, drag.origStart + clamped) * ppf);
      } else if (drag.mode === 'trim-right') {
        const minFrames = Math.ceil(MIN_DURATION_PX / ppf);
        const maxDelta = drag.origEnd - drag.origStart - minFrames;
        const raw = drag.origEnd + dFrames;
        const snapped = snapToFrame(raw);
        const neighborClamped = clampEdgeToNeighbor(engine.getState(), clip.id, 'end', snapped);
        const clamped = Math.max(neighborClamped - drag.origEnd, -maxDelta);
        setDraftTrimEnd(clamped);
        setSnapGuideX((drag.origEnd + clamped) * ppf);
      } else if (drag.mode === 'transition' && nextClip) {
        const clipADuration = clip.timelineEnd - clip.timelineStart;
        const clipBDuration = nextClip.timelineEnd - nextClip.timelineStart;
        const maxTransitionDuration = Math.floor(Math.min(clipADuration, clipBDuration) * 0.5);

        const baseDuration = drag.existingTransition?.durationFrames ?? 0;
        const deltaDuration = Math.round(-dFrames);
        const newDuration = Math.max(
          0,
          Math.min(maxTransitionDuration, baseDuration + deltaDuration),
        );
        setTransitionDraftDuration(newDuration);
      }
    },
    [ppf, clip.id, engine, nextClip],
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
        const maxDelta = drag.origEnd - drag.origStart - minFrames;
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
        const maxDelta = drag.origEnd - drag.origStart - minFrames;
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
      } else if (drag.mode === 'transition' && nextClip) {
        if (transitionDraftDuration > 0) {
          if (existingTransition) {
            engine.dispatch({
              id: crypto.randomUUID(),
              label: 'Set transition duration',
              timestamp: Date.now(),
              operations: [
                {
                  type: 'SET_TRANSITION_DURATION',
                  clipId: clip.id,
                  durationFrames: transitionDraftDuration,
                },
              ],
            } as any);
          } else {
            const transition = {
              id: crypto.randomUUID(),
              type: 'dissolve',
              durationFrames: transitionDraftDuration,
              alignment: 'centerOnCut',
              easing: { kind: 'Linear' },
              params: [],
            };
            engine.dispatch({
              id: crypto.randomUUID(),
              label: 'Add transition',
              timestamp: Date.now(),
              operations: [
                {
                  type: 'ADD_TRANSITION',
                  clipId: clip.id,
                  transition,
                },
              ],
            } as any);
          }
        } else if (existingTransition) {
          engine.dispatch({
            id: crypto.randomUUID(),
            label: 'Delete transition',
            timestamp: Date.now(),
            operations: [
              {
                type: 'DELETE_TRANSITION',
                clipId: clip.id,
              },
            ],
          } as any);
        }
      }

      dragRef.current = null;
      setIsDragging(false);
      setDraftDelta(0);
      setDraftTrimStart(0);
      setDraftTrimEnd(0);
      setSnapGuideX(null);
      setIsTransitionDragging(false);
      setTransitionDraftDuration(0);
    },
    [ppf, clip.id, engine, nextClip, existingTransition, transitionDraftDuration],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragRef.current) return;
      e.stopPropagation();

      if (isRazorMode) {
        const el = clipRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const offsetFrames = Math.floor(x / ppf);
        const atFrame = (clip.timelineStart + offsetFrames) as TimelineFrame;

        if (atFrame <= clip.timelineStart || atFrame >= clip.timelineEnd) return;

        // Route through engine.handlePointerDown + handlePointerUp so the
        // registered RazorTool runs with:
        //   - snap to ClipStart | ClipEnd | Playhead | Marker
        //   - Shift+click → slice all tracks at this frame
        //   - Core invariant validation
        // Do NOT reconstruct clips manually here — that's RazorTool's job.
        const modifiers = {
          shift: e.shiftKey,
          alt: e.altKey,
          ctrl: e.ctrlKey,
          meta: e.metaKey,
        };
        const pointerEvent = {
          frame: atFrame,
          trackId: clip.trackId,
          clipId: clip.id,
          captionId: null,
          x: e.clientX,
          y: e.clientY,
          buttons: 1,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          metaKey: e.metaKey,
        };
        engine.handlePointerDown(pointerEvent, modifiers);
        engine.handlePointerUp({ ...pointerEvent, buttons: 0 }, modifiers);
        return;
      }

      engine.toggleClipSelection(clip.id, e.metaKey || e.ctrlKey);
    },
    [clip, ppf, engine, isRazorMode],
  );

  const handleRazorPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isRazorMode) {
        setRazorHoverFrame(null);
        return;
      }
      const el = clipRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const offsetFrames = Math.floor(x / ppf);
      const frame = clip.timelineStart + offsetFrames;
      if (frame > clip.timelineStart && frame < clip.timelineEnd) {
        setRazorHoverFrame(frame);
      } else {
        setRazorHoverFrame(null);
      }
    },
    [isRazorMode, clip.timelineStart, clip.timelineEnd, ppf],
  );

  const handleRazorPointerLeave = useCallback(() => {
    setRazorHoverFrame(null);
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setRenameValue(clip.name ?? '');
      setIsRenaming(true);
    },
    [clip.name],
  );

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const commitRename = useCallback(() => {
    if (isRenaming) {
      const newName = renameValue.trim() || null;
      if (newName !== clip.name) {
        engine.dispatch({
          id: crypto.randomUUID(),
          label: 'Rename clip',
          timestamp: Date.now(),
          operations: [{ type: 'SET_CLIP_NAME', clipId: clip.id, name: newName }],
        });
      }
      setIsRenaming(false);
    }
  }, [isRenaming, renameValue, clip.name, clip.id, engine]);

  const cancelRename = useCallback(() => {
    setIsRenaming(false);
    setRenameValue('');
  }, []);

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

  const razorLineX = razorHoverFrame !== null ? (razorHoverFrame - clip.timelineStart) * ppf : null;

  const transitionWidth = isTransitionDragging
    ? transitionDraftDuration * ppf
    : existingTransition
      ? existingTransition.durationFrames * ppf
      : 0;

  return (
    <>
      {isDragging && snapGuideX !== null && (
        <div className="tl-snap-guide" style={{ left: snapGuideX }} />
      )}
      <div
        ref={clipRef}
        className={cn('tl-v2-clip', isSelected && 'is-selected', isDragging && 'is-dragging')}
        style={{
          left,
          width,
          background: clipBgVar[clipType] ?? 'var(--bg-raised)',
        }}
        tabIndex={isSelected ? 0 : -1}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onPointerMove={
          isDragging ? handlePointerMove : isRazorMode ? handleRazorPointerMove : undefined
        }
        onPointerUp={isDragging ? handlePointerUp : undefined}
        onPointerLeave={isRazorMode ? handleRazorPointerLeave : undefined}
      >
        {isRazorMode && razorLineX !== null && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: razorLineX,
              width: 1,
              background: 'white',
              opacity: 0.8,
              pointerEvents: 'none',
              zIndex: 5,
            }}
          />
        )}
        <div
          className="tl-v2-clip-move-zone"
          onPointerDown={isRazorMode ? undefined : handleMovePointerDown}
        />
        {isRenaming ? (
          <input
            ref={renameInputRef}
            className="tl-v2-clip-rename-input"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') cancelRename();
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="tl-v2-clip-label">{clip.name ?? 'Untitled'}</span>
        )}
        <div
          className="tl-v2-clip-trim-handle tl-v2-clip-trim-handle--left"
          onPointerDown={isRazorMode ? undefined : handleTrimLeftPointerDown}
        />
        <div
          className="tl-v2-clip-trim-handle tl-v2-clip-trim-handle--right"
          onPointerDown={isRazorMode ? undefined : handleTrimRightPointerDown}
        />
      </div>
      {isAdjacentToNext && isSelectionTool && (
        <div
          className={cn('tl-transition-handle', isTransitionDragging && 'is-dragging')}
          style={{
            left: left + width - TRANSITION_HANDLE_WIDTH / 2,
            width: TRANSITION_HANDLE_WIDTH,
          }}
          onPointerDown={handleTransitionPointerDown}
        />
      )}
      {existingTransition && transitionWidth > 0 && (
        <div
          className="tl-transition-visual"
          style={{
            left: left + width - transitionWidth / 2,
            width: transitionWidth,
          }}
        />
      )}
    </>
  );
}
