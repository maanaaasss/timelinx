import { useState, useCallback, useRef } from 'react';
import type { TimelineState, Clip, TimelineFrame } from '@timelinx/core';
import { TimelineRuler } from './timeline-ruler';
import { TimelineTrackArea } from './timeline-track-area';
import { TimelineToolbar, type ToolId } from './timeline-toolbar';
import { useTimelineKeyboard } from '../hooks/use-timeline-keyboard';

const ZOOM_MIN = 2;
const ZOOM_MAX = 50;
const ZOOM_DEFAULT = 10;

export interface TimelineLayoutProps {
  state: TimelineState;
  ppf: number;
}

export function TimelineLayout({ state, ppf: initialPpf }: TimelineLayoutProps) {
  const [rulerScrollLeft, setRulerScrollLeft] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedClipIds, setSelectedClipIds] = useState<Set<string>>(new Set());
  const [clips, setClips] = useState<Clip[]>(() => state.timeline.tracks.flatMap((t) => t.clips));
  const [activeTool, setActiveTool] = useState<ToolId>('select');
  const [zoom, setZoom] = useState(initialPpf);
  const [isPlaying, setIsPlaying] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const rulerContainerRef = useRef<HTMLDivElement>(null);
  const trackAreaRef = useRef<HTMLDivElement | null>(null);
  const playheadDragScrollRef = useRef(0);

  const ppf = zoom;
  const { timeline } = state;

  const handleTrackScroll = useCallback((scrollLeft: number) => {
    setRulerScrollLeft(scrollLeft);
  }, []);

  const handleSeek = useCallback((frame: number) => {
    setCurrentTime(frame);
  }, []);

  const handleSelectClip = useCallback((clipId: string, additive: boolean) => {
    setSelectedClipIds((prev) => {
      if (additive) {
        const next = new Set(prev);
        if (next.has(clipId)) {
          next.delete(clipId);
        } else {
          next.add(clipId);
        }
        return next;
      }
      return new Set([clipId]);
    });
  }, []);

  const handleUpdateClip = useCallback(
    (clipId: string, start: TimelineFrame, end: TimelineFrame) => {
      setClips((prev) =>
        prev.map((c) => (c.id === clipId ? { ...c, timelineStart: start, timelineEnd: end } : c)),
      );
    },
    [],
  );

  const handleNudgeClip = useCallback((clipId: string, deltaFrames: number) => {
    setClips((prev) =>
      prev.map((c) => {
        if (c.id !== clipId) return c;
        const dur = c.timelineEnd - c.timelineStart;
        const newStart = Math.max(0, c.timelineStart + deltaFrames) as TimelineFrame;
        return { ...c, timelineStart: newStart, timelineEnd: (newStart + dur) as TimelineFrame };
      }),
    );
  }, []);

  const handleDeleteClip = useCallback((clipId: string) => {
    setClips((prev) => prev.filter((c) => c.id !== clipId));
    setSelectedClipIds((prev) => {
      const next = new Set(prev);
      next.delete(clipId);
      return next;
    });
    containerRef.current?.focus();
  }, []);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const handleZoomChange = useCallback((v: number) => {
    setZoom(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v)));
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(ZOOM_MAX, z * 1.5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(ZOOM_MIN, z / 1.5));
  }, []);

  const handlePlayheadDragStart = useCallback(
    (containerRef: React.RefObject<HTMLDivElement | null>) => {
      trackAreaRef.current = containerRef.current;
      playheadDragScrollRef.current = containerRef.current?.scrollLeft ?? 0;

      const handleMove = (e: PointerEvent) => {
        const el = trackAreaRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const scrollLeft = el.scrollLeft;
        const x = e.clientX - rect.left + scrollLeft;
        const frame = Math.max(0, Math.round(x / ppf));
        setCurrentTime(frame);
      };

      const handleUp = () => {
        trackAreaRef.current = null;
        document.removeEventListener('pointermove', handleMove);
        document.removeEventListener('pointerup', handleUp);
      };

      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
    },
    [ppf],
  );

  useTimelineKeyboard({
    containerRef,
    fps: timeline.fps,
    currentTime,
    onSeek: handleSeek,
    selectedClipIds,
    onNudgeClip: handleNudgeClip,
    onDeleteClip: handleDeleteClip,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    isPlaying,
    onTogglePlay: handleTogglePlay,
  });

  return (
    <div className="timeline-layout" ref={containerRef} tabIndex={0}>
      <TimelineToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        currentTime={currentTime}
        fps={timeline.fps}
        zoom={zoom}
        zoomMin={ZOOM_MIN}
        zoomMax={ZOOM_MAX}
        zoomDefault={ZOOM_DEFAULT}
        onZoomChange={handleZoomChange}
      />
      <div className="timeline-ruler-wrapper">
        <TimelineRuler
          fps={timeline.fps}
          ppf={ppf}
          duration={timeline.duration}
          scrollLeft={rulerScrollLeft}
          currentTime={currentTime}
          onSeek={handleSeek}
          containerRef={rulerContainerRef}
        />
      </div>
      <TimelineTrackArea
        tracks={timeline.tracks}
        clips={clips}
        ppf={ppf}
        fps={timeline.fps}
        duration={timeline.duration}
        currentTime={currentTime}
        selectedClipIds={selectedClipIds}
        onSelectClip={handleSelectClip}
        onUpdateClip={handleUpdateClip}
        onSeek={handleSeek}
        onPlayheadDragStart={handlePlayheadDragStart}
        onScrollHorizontal={handleTrackScroll}
      />
      <div className="status-bar">
        <span>{timeline.fps} fps</span>
        <span>{timeline.tracks.length} tracks</span>
        <span>Frame: {currentTime}</span>
        <span>Zoom: {ppf.toFixed(1)}px/f</span>
        <span>Selected: {selectedClipIds.size || 'none'}</span>
        {isPlaying && <span style={{ color: 'var(--color-success)' }}>▶ Playing</span>}
      </div>
    </div>
  );
}
