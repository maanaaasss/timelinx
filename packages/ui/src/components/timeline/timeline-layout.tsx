import { useState, useCallback, useRef } from 'react';
import type { FrameRate } from '@timelinx/core';
import { toTrackId, createTrack } from '@timelinx/core';
import {
  useTimelineWithEngine,
  usePlayheadFrame,
  useSelectedClipIds,
  useFps,
} from '@timelinx/react';
import { useTimelineContext } from '../../context/timeline-context';
import { TimelineRulerV2 } from './timeline-ruler';
import { TimelineTrackAreaV2 } from './timeline-track-area';
import { TimelineToolbarV2, type ToolId } from './timeline-toolbar';
import { useTimelineKeyboard } from '../../hooks/use-timeline-keyboard';

const ZOOM_MIN = 2;
const ZOOM_MAX = 50;
const ZOOM_DEFAULT = 10;

export interface TimelineLayoutProps {
  className?: string;
  showToolbar?: boolean;
  showRuler?: boolean;
  showStatusBar?: boolean;
}

export function TimelineLayout({
  className,
  showToolbar = true,
  showRuler = true,
  showStatusBar = true,
}: TimelineLayoutProps) {
  const { engine, ppf, setPpf } = useTimelineContext();
  const timeline = useTimelineWithEngine(engine);
  const currentFrame = usePlayheadFrame(engine);
  const selectedClipIds = useSelectedClipIds(engine);
  const fps = useFps(engine) as unknown as FrameRate;

  const [rulerScrollLeft, setRulerScrollLeft] = useState(0);
  const [activeTool, setActiveTool] = useState<ToolId>('select');
  // Local height overrides during live resize gestures. Committed to engine
  // on pointer-up via handleHeightChange → SET_TRACK_HEIGHT.
  const [trackHeights, setTrackHeights] = useState<Record<string, number>>({});

  // Declared outside render cycle in the module, but kept here to avoid
  // breaking the existing shape. In future extract to module scope.
  const TOOL_MAP: Record<ToolId, string> = {
    select: 'selection',
    razor: 'razor',
    hand: 'hand',
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const rulerContainerRef = useRef<HTMLDivElement>(null);

  const tracks = timeline.tracks;
  const allClips = tracks.flatMap((t: any) => t.clips);

  const handleToolChange = useCallback((tool: ToolId) => {
    setActiveTool(tool);
    engine.activateTool(TOOL_MAP[tool]);
  }, [engine]);

  const handleTrackScroll = useCallback((scrollLeft: number) => {
    setRulerScrollLeft(scrollLeft);
  }, []);

  const handleSeek = useCallback((frame: number) => {
    engine.seekTo(frame as any);
  }, [engine]);

  const handleZoomChange = useCallback((v: number) => {
    setPpf(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v)));
  }, [setPpf]);

  const handleZoomIn = useCallback(() => {
    setPpf(Math.min(ZOOM_MAX, ppf * 1.5));
  }, [ppf, setPpf]);

  const handleZoomOut = useCallback(() => {
    setPpf(Math.max(ZOOM_MIN, ppf / 1.5));
  }, [ppf, setPpf]);

  const handleAddTrack = useCallback((type: 'video' | 'audio') => {
    const trackCount = tracks.length;
    const newTrack = createTrack({
      id: crypto.randomUUID(),
      name: type === 'video' ? `V${trackCount + 1}` : `A${trackCount + 1}`,
      type,
    });
    engine.dispatch({
      id: crypto.randomUUID(),
      label: `Add ${type} track`,
      timestamp: Date.now(),
      operations: [{ type: 'ADD_TRACK', track: newTrack }],
    });
  }, [engine, tracks.length]);

  // Persist track height to engine state. The local override is set during
  // the live drag gesture; after engine commit we clear it so undo/redo
  // (which modifies engine state) isn't masked by a stale local value.
  const handleHeightChange = useCallback((trackId: string, height: number) => {
    setTrackHeights((prev) => ({ ...prev, [trackId]: height }));
    engine.dispatch({
      id: crypto.randomUUID(),
      label: 'Resize track',
      timestamp: Date.now(),
      operations: [{ type: 'SET_TRACK_HEIGHT', trackId: toTrackId(trackId), height }],
    });
    // Clear local override: engine is now the source of truth for this track.
    setTrackHeights((prev) => {
      const next = { ...prev };
      delete next[trackId];
      return next;
    });
  }, [engine]);

  useTimelineKeyboard({
    containerRef,
    engine,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onToolChange: (toolId) => handleToolChange(toolId as ToolId),
  });

  return (
    <div
      className={`tl-layout${className ? ` ${className}` : ''}`}
      ref={containerRef}
      tabIndex={0}
    >
      {showToolbar && (
        <TimelineToolbarV2
          activeTool={activeTool}
          onToolChange={handleToolChange}
          currentTime={currentFrame}
          fps={fps}
          zoom={ppf}
          zoomMin={ZOOM_MIN}
          zoomMax={ZOOM_MAX}
          zoomDefault={ZOOM_DEFAULT}
          onZoomChange={handleZoomChange}
          onAddTrack={handleAddTrack}
        />
      )}
      {showRuler && (
        <div className="tl-ruler-wrapper">
          <TimelineRulerV2
            fps={fps}
            ppf={ppf}
            duration={timeline.duration}
            scrollLeft={rulerScrollLeft}
            currentTime={currentFrame}
            onSeek={handleSeek}
            containerRef={rulerContainerRef}
            inPoint={timeline.inPoint}
            outPoint={timeline.outPoint}
          />
        </div>
      )}
      <TimelineTrackAreaV2
        tracks={tracks}
        clips={allClips}
        ppf={ppf}
        fps={fps}
        duration={timeline.duration}
        selectedClipIds={selectedClipIds}
        engine={engine}
        onSeek={handleSeek}
        onScrollHorizontal={handleTrackScroll}
        heights={trackHeights}
        onHeightChange={handleHeightChange}
      />
      {showStatusBar && (
        <div className="tl-status-bar">
          <span>{fps} fps</span>
          <span>{tracks.length} tracks</span>
          <span>Frame: {currentFrame}</span>
          <span>Zoom: {ppf.toFixed(1)}px/f</span>
          <span>Selected: {selectedClipIds.size || 'none'}</span>
        </div>
      )}
    </div>
  );
}
