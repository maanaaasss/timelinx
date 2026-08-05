import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useAllTracks, useSelectedClipIds } from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';
import type { Clip, ClipTransform, ClipId } from '@timelinx/core';

// Canvas logical resolution — must match canvas-compositor.tsx
const CANVAS_W = 1920;
const CANVAS_H = 1080;

// Default clip dimensions when intrinsic size is unknown
const DEFAULT_CLIP_W = CANVAS_W;
const DEFAULT_CLIP_H = CANVAS_H;

// Handle size in pixels
const HANDLE_SIZE = 8;
const ROTATION_HANDLE_OFFSET = 20;

// Snap threshold in screen pixels
const SNAP_THRESHOLD_SCREEN = 8;
// Snap distance in canvas logical pixels (for actual position snapping)
const SNAP_DISTANCE = 2;

// ── Types ──────────────────────────────────────────────────────────────────

interface ClipBounds {
  clipId: string;
  x: number;      // left edge in canvas coords
  y: number;      // top edge in canvas coords
  width: number;  // width in canvas coords
  height: number; // height in canvas coords
  transform: ClipTransform;
}

interface SnapLine {
  type: 'horizontal' | 'vertical';
  position: number;  // y for horizontal, x for vertical (in canvas coords)
}

export interface PreviewOverlayProps {
  className?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Convert a screen point to canvas logical coordinates (1920×1080).
 */
function screenToCanvas(
  screenX: number,
  screenY: number,
  containerRect: DOMRect,
): { x: number; y: number } {
  const scaleX = CANVAS_W / containerRect.width;
  const scaleY = CANVAS_H / containerRect.height;
  return {
    x: (screenX - containerRect.left) * scaleX,
    y: (screenY - containerRect.top) * scaleY,
  };
}

/**
 * Convert screen pixels to canvas logical pixels.
 */
function screenToCanvasScale(
  screenPixels: number,
  containerRect: DOMRect,
): number {
  const scale = CANVAS_W / containerRect.width;
  return screenPixels * scale;
}

/**
 * Compute the AABB bounds of a clip in canvas logical coordinates.
 * Position is relative to canvas center (CANVAS_W/2, CANVAS_H/2).
 */
function getClipBounds(clip: Clip): ClipBounds {
  const transform = clip.transform!;

  const px = transform.positionX.value;
  const py = transform.positionY.value;
  const sx = transform.scaleX.value;
  const sy = transform.scaleY.value;
  const ax = transform.anchorX.value;
  const ay = transform.anchorY.value;

  // Clip intrinsic dimensions (default to canvas size)
  const clipW = DEFAULT_CLIP_W;
  const clipH = DEFAULT_CLIP_H;

  // Scaled dimensions
  const scaledW = clipW * sx;
  const scaledH = clipH * sy;

  // Position is offset from canvas center, anchor shifts the origin
  const centerX = CANVAS_W / 2 + px - ax * sx;
  const centerY = CANVAS_H / 2 + py - ay * sy;

  return {
    clipId: clip.id as string,
    x: centerX - scaledW / 2,
    y: centerY - scaledH / 2,
    width: scaledW,
    height: scaledH,
    transform,
  };
}

/**
 * Test if a point is inside a clip's AABB (ignoring rotation for simplicity).
 */
function hitTestClip(
  canvasX: number,
  canvasY: number,
  bounds: ClipBounds,
): boolean {
  return (
    canvasX >= bounds.x &&
    canvasX <= bounds.x + bounds.width &&
    canvasY >= bounds.y &&
    canvasY <= bounds.y + bounds.height
  );
}

/**
 * Get the edges of a clip bounds (left, right, top, bottom, center-x, center-y).
 */
function getClipEdges(bounds: ClipBounds) {
  return {
    left: bounds.x,
    right: bounds.x + bounds.width,
    top: bounds.y,
    bottom: bounds.y + bounds.height,
    centerX: bounds.x + bounds.width / 2,
    centerY: bounds.y + bounds.height / 2,
  };
}

/**
 * Calculate snap lines by comparing dragged clip edges against other clips.
 * Also returns the snapped position adjustment if within snap distance.
 */
function calculateSnaps(
  draggedBounds: ClipBounds,
  otherBounds: ClipBounds[],
  snapThreshold: number,
): { snapLines: SnapLine[]; snapDx: number; snapDy: number } {
  const snapLines: SnapLine[] = [];
  let snapDx = 0;
  let snapDy = 0;

  const draggedEdges = getClipEdges(draggedBounds);
  let bestDx = Infinity;
  let bestDy = Infinity;

  for (const other of otherBounds) {
    const otherEdges = getClipEdges(other);

    // Vertical snap lines (left, right, centerX)
    const verticalEdges = [
      { drag: draggedEdges.left, other: otherEdges.left },
      { drag: draggedEdges.left, other: otherEdges.right },
      { drag: draggedEdges.right, other: otherEdges.left },
      { drag: draggedEdges.right, other: otherEdges.right },
      { drag: draggedEdges.centerX, other: otherEdges.centerX },
      { drag: draggedEdges.left, other: otherEdges.centerX },
      { drag: draggedEdges.right, other: otherEdges.centerX },
      { drag: draggedEdges.centerX, other: otherEdges.left },
      { drag: draggedEdges.centerX, other: otherEdges.right },
    ];

    for (const { drag, other: otherEdge } of verticalEdges) {
      const diff = Math.abs(drag - otherEdge);
      if (diff < snapThreshold) {
        snapLines.push({ type: 'vertical', position: otherEdge });
        if (diff < Math.abs(bestDx)) {
          bestDx = otherEdge - drag;
        }
      }
    }

    // Horizontal snap lines (top, bottom, centerY)
    const horizontalEdges = [
      { drag: draggedEdges.top, other: otherEdges.top },
      { drag: draggedEdges.top, other: otherEdges.bottom },
      { drag: draggedEdges.bottom, other: otherEdges.top },
      { drag: draggedEdges.bottom, other: otherEdges.bottom },
      { drag: draggedEdges.centerY, other: otherEdges.centerY },
      { drag: draggedEdges.top, other: otherEdges.centerY },
      { drag: draggedEdges.bottom, other: otherEdges.centerY },
      { drag: draggedEdges.centerY, other: otherEdges.top },
      { drag: draggedEdges.centerY, other: otherEdges.bottom },
    ];

    for (const { drag, other: otherEdge } of horizontalEdges) {
      const diff = Math.abs(drag - otherEdge);
      if (diff < snapThreshold) {
        snapLines.push({ type: 'horizontal', position: otherEdge });
        if (diff < Math.abs(bestDy)) {
          bestDy = otherEdge - drag;
        }
      }
    }
  }

  // Apply snap adjustment (only if within snap distance for actual snapping)
  if (Math.abs(bestDx) < SNAP_DISTANCE) {
    snapDx = bestDx;
  }
  if (Math.abs(bestDy) < SNAP_DISTANCE) {
    snapDy = bestDy;
  }

  return { snapLines, snapDx, snapDy };
}

// ── Selection Box ──────────────────────────────────────────────────────────

interface SelectionBoxProps {
  bounds: ClipBounds;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}

function SelectionBox({ bounds, isDragging, onPointerDown }: SelectionBoxProps) {
  const { transform } = bounds;

  // Position as percentages of canvas
  const left = (bounds.x / CANVAS_W) * 100;
  const top = (bounds.y / CANVAS_H) * 100;
  const width = (bounds.width / CANVAS_W) * 100;
  const height = (bounds.height / CANVAS_H) * 100;

  // Anchor point in local coords
  const anchorX = (DEFAULT_CLIP_W / 2) * transform.scaleX.value;
  const anchorY = (DEFAULT_CLIP_H / 2) * transform.scaleY.value;

  // Handle positions (percentages within the selection box)
  const handles = [
    { pos: 'nw', left: 0, top: 0 },
    { pos: 'n', left: 50, top: 0 },
    { pos: 'ne', left: 100, top: 0 },
    { pos: 'e', left: 100, top: 50 },
    { pos: 'se', left: 100, top: 100 },
    { pos: 's', left: 50, top: 100 },
    { pos: 'sw', left: 0, top: 100 },
    { pos: 'w', left: 0, top: 50 },
  ];

  return (
    <div
      className={`selection-box${isDragging ? ' is-dragging' : ''}`}
      style={{
        position: 'absolute',
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
        transform: `rotate(${transform.rotation.value}deg)`,
        transformOrigin: `${anchorX}px ${anchorY}px`,
      }}
      onPointerDown={onPointerDown}
    >
      {/* Resize handles */}
      {handles.map((h) => (
        <div
          key={h.pos}
          className="selection-handle"
          data-handle={h.pos}
          style={{
            position: 'absolute',
            left: `${h.left}%`,
            top: `${h.top}%`,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {/* Rotation handle */}
      <div
        className="rotation-handle"
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          transform: `translate(-50%, -${ROTATION_HANDLE_OFFSET}px)`,
        }}
      >
        <div className="rotation-handle-stem" />
        <div className="rotation-handle-knob" />
      </div>
    </div>
  );
}

// ── Snap Lines ─────────────────────────────────────────────────────────────

interface SnapLinesProps {
  snapLines: SnapLine[];
  containerRect: DOMRect | null;
}

function SnapLines({ snapLines, containerRect }: SnapLinesProps) {
  if (!containerRect || snapLines.length === 0) return null;

  // Deduplicate snap lines by position and type
  const seen = new Set<string>();
  const uniqueLines: SnapLine[] = [];
  for (const line of snapLines) {
    const key = `${line.type}-${line.position}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueLines.push(line);
    }
  }

  return (
    <>
      {uniqueLines.map((line, i) => {
        if (line.type === 'horizontal') {
          const topPercent = (line.position / CANVAS_H) * 100;
          return (
            <div
              key={`h-${i}`}
              className="snap-line snap-line--horizontal"
              style={{ top: `${topPercent}%` }}
            />
          );
        } else {
          const leftPercent = (line.position / CANVAS_W) * 100;
          return (
            <div
              key={`v-${i}`}
              className="snap-line snap-line--vertical"
              style={{ left: `${leftPercent}%` }}
            />
          );
        }
      })}
    </>
  );
}

// ── PreviewOverlay ─────────────────────────────────────────────────────────

export const PreviewOverlay = React.memo(function PreviewOverlay({
  className,
}: PreviewOverlayProps) {
  const { engine } = useTimelineContext();
  const tracks = useAllTracks(engine);
  const selection = useSelectedClipIds(engine);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Drag state ──
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ screenX: number; screenY: number; pos: { x: number; y: number } } | null>(null);
  const draftPosRef = useRef<{ x: number; y: number } | null>(null);
  const [draftPos, setDraftPos] = useState<{ x: number; y: number } | null>(null);

  // ── Snap state ──
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
  const containerRectRef = useRef<DOMRect | null>(null);

  // Get the selected clip
  const selectedClipId = selection.size === 1 ? Array.from(selection)[0] : null;
  const selectedClip = useMemo(() => {
    if (!selectedClipId) return null;
    for (const track of tracks) {
      for (const clip of track.clips) {
        if ((clip.id as string) === selectedClipId) return clip;
      }
    }
    return null;
  }, [tracks, selectedClipId]);

  // Collect all clips with their bounds (excluding selected clip)
  const otherClipBounds = useMemo(() => {
    const bounds: ClipBounds[] = [];
    for (const track of tracks) {
      for (const clip of track.clips) {
        if (clip.transform && (clip.id as string) !== selectedClipId) {
          bounds.push(getClipBounds(clip));
        }
      }
    }
    return bounds;
  }, [tracks, selectedClipId]);

  // Compute bounds with draft position if dragging
  const selectedBounds = useMemo(() => {
    if (!selectedClip) return null;
    if (draftPos && isDragging) {
      // Create a modified clip with draft position for bounds calculation
      const modifiedClip = {
        ...selectedClip,
        transform: {
          ...selectedClip.transform!,
          positionX: { ...selectedClip.transform!.positionX, value: draftPos.x },
          positionY: { ...selectedClip.transform!.positionY, value: draftPos.y },
        },
      };
      return getClipBounds(modifiedClip as Clip);
    }
    return getClipBounds(selectedClip);
  }, [selectedClip, draftPos, isDragging]);

  // Calculate snap lines during drag
  useEffect(() => {
    if (!isDragging || !selectedBounds) {
      setSnapLines([]);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    containerRectRef.current = rect;

    // Convert screen threshold to canvas coords
    const snapThresholdCanvas = screenToCanvasScale(SNAP_THRESHOLD_SCREEN, rect);

    const { snapLines: lines, snapDx, snapDy } = calculateSnaps(
      selectedBounds,
      otherClipBounds,
      snapThresholdCanvas,
    );

    setSnapLines(lines);

    // Apply snap adjustment to draft position
    if ((snapDx !== 0 || snapDy !== 0) && draftPosRef.current) {
      draftPosRef.current = {
        x: draftPosRef.current.x + snapDx,
        y: draftPosRef.current.y + snapDy,
      };
      setDraftPos({ ...draftPosRef.current });
    }
  }, [isDragging, selectedBounds, otherClipBounds]);

  // ── Drag handlers ──

  const handleDragPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!selectedClip || e.button !== 0) return;

      const container = containerRef.current;
      if (!container) return;

      // Prevent click-to-deselect from firing
      e.stopPropagation();

      const rect = container.getBoundingClientRect();
      containerRectRef.current = rect;

      setIsDragging(true);
      dragStartRef.current = {
        screenX: e.clientX,
        screenY: e.clientY,
        pos: {
          x: selectedClip.transform!.positionX.value,
          y: selectedClip.transform!.positionY.value,
        },
      };
      draftPosRef.current = {
        x: selectedClip.transform!.positionX.value,
        y: selectedClip.transform!.positionY.value,
      };
      setDraftPos(draftPosRef.current);

      // Capture pointer for smooth dragging
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [selectedClip],
  );

  const handleDragPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !dragStartRef.current) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();

      // Calculate delta in canvas logical pixels
      const startCanvas = screenToCanvas(dragStartRef.current.screenX, dragStartRef.current.screenY, rect);
      const currentCanvas = screenToCanvas(e.clientX, e.clientY, rect);
      const dx = currentCanvas.x - startCanvas.x;
      const dy = currentCanvas.y - startCanvas.y;

      // Update draft position
      draftPosRef.current = {
        x: dragStartRef.current.pos.x + dx,
        y: dragStartRef.current.pos.y + dy,
      };
      setDraftPos(draftPosRef.current);
    },
    [isDragging],
  );

  const handleDragPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !draftPosRef.current || !selectedClip) return;

      // Release pointer capture
      e.currentTarget.releasePointerCapture(e.pointerId);

      // Commit: dispatch once with final values
      const currentTransform = selectedClip.transform!;
      engine.dispatch({
        id: `move-clip-${Date.now()}`,
        label: 'Move clip',
        timestamp: Date.now(),
        operations: [
          {
            type: 'SET_CLIP_TRANSFORM',
            clipId: selectedClip.id as ClipId,
            transform: {
              ...currentTransform,
              positionX: { ...currentTransform.positionX, value: draftPosRef.current.x },
              positionY: { ...currentTransform.positionY, value: draftPosRef.current.y },
            },
          },
        ],
      });

      // Clear draft state
      setIsDragging(false);
      dragStartRef.current = null;
      draftPosRef.current = null;
      setDraftPos(null);
      setSnapLines([]);
    },
    [isDragging, selectedClip, engine],
  );

  // Handle Escape to cancel drag
  useEffect(() => {
    if (!isDragging) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        // Cancel: revert to original position
        setIsDragging(false);
        dragStartRef.current = null;
        draftPosRef.current = null;
        setDraftPos(null);
        setSnapLines([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDragging]);

  // Click to select (only when not dragging)
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const canvasPoint = screenToCanvas(e.clientX, e.clientY, rect);

      // Test clips in reverse order (top-most first)
      for (let i = allClipBounds.length - 1; i >= 0; i--) {
        const bounds = allClipBounds[i]!;
        if (hitTestClip(canvasPoint.x, canvasPoint.y, bounds)) {
          engine.setSelectedClipIds(new Set([bounds.clipId]));
          return;
        }
      }

      // Click on empty space — deselect
      engine.clearSelection();
    },
    [engine, allClipBounds, isDragging],
  );

  return (
    <div
      ref={containerRef}
      className={`preview-overlay${className ? ` ${className}` : ''}`}
      onClick={handleClick}
    >
      {selectedBounds && (
        <SelectionBox
          bounds={selectedBounds}
          isDragging={isDragging}
          onPointerDown={handleDragPointerDown}
        />
      )}
      <SnapLines snapLines={snapLines} containerRect={containerRectRef.current} />
    </div>
  );
});
