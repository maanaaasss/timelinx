import { useState, useCallback, useRef, useEffect } from 'react';
import type { FrameRate } from '@timelinx/core';
import { toTrackId, toClipId, createTrack } from '@timelinx/core';
import {
  useTimelineWithEngine,
  usePlayheadFrame,
  useSelectedClipIds,
  useFps,
  useIsPlaying,
  usePlaybackEngine,
} from '@timelinx/react';
import { useTimelineContext } from '../../context/timeline-context';
import { TimelineRulerV2 } from './timeline-ruler';
import { TimelineTrackAreaV2 } from './timeline-track-area';
import { TimelineToolbarV2, type ToolId } from './timeline-toolbar';
import { TimelineToolbarV3, type PageDefinition } from './timeline-toolbar-v3';
import { TimelineRulerV3 } from './timeline-ruler-v3';
import { TimelineEmptyState } from './timeline-empty-state';
import { useTimelineKeyboard } from '../../hooks/use-timeline-keyboard';
import { cn } from '../../shared/cn';

const ZOOM_MIN = 2;
const ZOOM_MAX = 50;
const ZOOM_DEFAULT = 10;

export interface TimelineLayoutProps {
  className?: string;
  /**
   * Layout variant:
   * - 'v3': Modern CapCut / Canva-style timeline with TimelineToolbarV3, TimelineRulerV3,
   *         white geometric playhead, cut/delete actions, transport, and empty-state support. (Default)
   * - 'v2': Classic NLE layout with TimelineToolbarV2 and TimelineRulerV2.
   */
  variant?: 'v2' | 'v3';
  showToolbar?: boolean;
  showRuler?: boolean;
  showStatusBar?: boolean;
  /** Page / composition definitions for V3 toolbar */
  pages?: PageDefinition[];
  /** Currently active page ID for V3 toolbar */
  activePage?: string;
  /** Callback when user changes active page */
  onPageChange?: (pageId: string) => void;
  /** Timecode display format for V3 toolbar */
  timeFormat?: 'mss' | 'timecode';
  /** Called when user clicks the empty state upload button */
  onUpload?: () => void;
  /** Alias for onUpload */
  onEmptyUpload?: () => void;
  /** Label for empty state button. Defaults to "Upload Media". */
  emptyStateLabel?: string;
  /** Optional external override for playing state */
  isPlaying?: boolean;
  /** Optional external override for play/pause toggle */
  onPlayPause?: () => void;
}

export type TimelineLayoutV3Props = Omit<TimelineLayoutProps, 'variant'>;

export function TimelineLayout({
  className,
  variant = 'v3',
  showToolbar = true,
  showRuler = true,
  showStatusBar = true,
  pages,
  activePage,
  onPageChange,
  timeFormat = 'mss',
  onUpload,
  onEmptyUpload,
  emptyStateLabel = 'Upload Media',
  isPlaying: externalIsPlaying,
  onPlayPause: externalOnPlayPause,
}: TimelineLayoutProps) {
  const { engine, ppf, setPpf } = useTimelineContext();
  const timeline = useTimelineWithEngine(engine);
  const currentFrame = usePlayheadFrame(engine);
  const selectedClipIds = useSelectedClipIds(engine);
  const fps = useFps(engine) as unknown as FrameRate;

  const playbackEngine = usePlaybackEngine(engine);
  const engineIsPlaying = useIsPlaying(engine);
  const [internalPlaying, setInternalPlaying] = useState(false);

  const isPlaying = externalIsPlaying ?? (playbackEngine ? engineIsPlaying : internalPlaying);

  const [rulerScrollLeft, setRulerScrollLeft] = useState(0);
  const [activeTool, setActiveTool] = useState<ToolId>('select');
  // Local height overrides during live resize gestures. Committed to engine
  // on pointer-up via handleHeightChange → SET_TRACK_HEIGHT.
  const [trackHeights, setTrackHeights] = useState<Record<string, number>>({});

  const TOOL_MAP: Record<ToolId, string> = {
    select: 'selection',
    razor: 'razor',
    hand: 'hand',
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const rulerContainerRef = useRef<HTMLDivElement>(null);

  const tracks = timeline.tracks;
  const allClips = tracks.flatMap((t: any) => t.clips);

  const handleToolChange = useCallback(
    (tool: ToolId) => {
      setActiveTool(tool);
      engine.activateTool(TOOL_MAP[tool]);
    },
    [engine],
  );

  const handleTrackScroll = useCallback((scrollLeft: number) => {
    setRulerScrollLeft(scrollLeft);
  }, []);

  const handleSeek = useCallback(
    (frame: number) => {
      engine.seekTo(frame as any);
    },
    [engine],
  );

  const handleZoomChange = useCallback(
    (v: number) => {
      setPpf(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v)));
    },
    [setPpf],
  );

  const handleZoomIn = useCallback(() => {
    setPpf(Math.min(ZOOM_MAX, ppf * 1.4));
  }, [ppf, setPpf]);

  const handleZoomOut = useCallback(() => {
    setPpf(Math.max(ZOOM_MIN, ppf / 1.4));
  }, [ppf, setPpf]);

  const handleZoomFit = useCallback(() => {
    const container = containerRef.current;
    const dur = Number(timeline.duration) || 1;
    const availableWidth = container ? Math.max(container.clientWidth - 48, 200) : 800;
    const fitPpf = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, availableWidth / dur));
    setPpf(fitPpf);
  }, [timeline.duration, setPpf]);

  const handleAddTrack = useCallback(
    (type: 'video' | 'audio') => {
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
    },
    [engine, tracks.length],
  );

  const handleDefaultUpload = useCallback(() => {
    const cb = onUpload ?? onEmptyUpload;
    if (cb) {
      cb();
      return;
    }
    handleAddTrack('video');
  }, [onUpload, onEmptyUpload, handleAddTrack]);

  // Persist track height to engine state
  const handleHeightChange = useCallback(
    (trackId: string, height: number) => {
      setTrackHeights((prev) => ({ ...prev, [trackId]: height }));
      engine.dispatch({
        id: crypto.randomUUID(),
        label: 'Resize track',
        timestamp: Date.now(),
        operations: [{ type: 'SET_TRACK_HEIGHT', trackId: toTrackId(trackId), height }],
      });
      setTrackHeights((prev) => {
        const next = { ...prev };
        delete next[trackId];
        return next;
      });
    },
    [engine],
  );

  // Split / Cut clip(s) under playhead
  const handleCut = useCallback(() => {
    const frame = engine.getPlayheadFrame();
    const state = engine.getState();
    const currentTracks = state.timeline.tracks;

    let targetClips: any[] = [];
    if (selectedClipIds.size > 0) {
      for (const track of currentTracks) {
        for (const clip of track.clips) {
          if (
            selectedClipIds.has(clip.id) &&
            (clip.timelineStart as number) < frame &&
            (clip.timelineEnd as number) > frame
          ) {
            targetClips.push(clip);
          }
        }
      }
    }

    if (targetClips.length === 0) {
      for (const track of currentTracks) {
        for (const clip of track.clips) {
          if (
            (clip.timelineStart as number) < frame &&
            (clip.timelineEnd as number) > frame
          ) {
            targetClips.push(clip);
          }
        }
      }
    }

    if (targetClips.length === 0) return;

    const operations: any[] = [];
    for (const clip of targetClips) {
      const offset = frame - (clip.timelineStart as number);
      const splitMediaPoint = (clip.mediaIn as number) + offset;
      const leftClip = {
        ...clip,
        id: crypto.randomUUID(),
        timelineEnd: frame,
        mediaOut: splitMediaPoint,
      };
      const rightClip = {
        ...clip,
        id: crypto.randomUUID(),
        timelineStart: frame,
        mediaIn: splitMediaPoint,
      };

      operations.push(
        { type: 'DELETE_CLIP', clipId: clip.id },
        { type: 'INSERT_CLIP', trackId: clip.trackId, clip: leftClip },
        { type: 'INSERT_CLIP', trackId: clip.trackId, clip: rightClip },
      );
    }

    engine.dispatch({
      id: crypto.randomUUID(),
      label: `Cut ${targetClips.length} clip(s) at frame ${frame}`,
      timestamp: Date.now(),
      operations,
    });
  }, [engine, selectedClipIds]);

  // Delete selected clips
  const handleDelete = useCallback(() => {
    if (selectedClipIds.size === 0) return;

    const operations = Array.from(selectedClipIds).map((clipId) => ({
      type: 'DELETE_CLIP' as const,
      clipId: toClipId(clipId),
    }));

    engine.dispatch({
      id: crypto.randomUUID(),
      label: operations.length === 1 ? 'Delete clip' : `Delete ${operations.length} clips`,
      timestamp: Date.now(),
      operations,
    });
    engine.clearSelection();
  }, [engine, selectedClipIds]);

  // Play/Pause toggling
  const handlePlayPause = useCallback(() => {
    if (externalOnPlayPause) {
      externalOnPlayPause();
      return;
    }
    if (playbackEngine) {
      if (engineIsPlaying) playbackEngine.pause();
      else playbackEngine.play();
    } else {
      setInternalPlaying((prev) => {
        const next = !prev;
        if (next && currentFrame >= (timeline.duration as number)) {
          engine.seekTo(0 as any);
        }
        return next;
      });
    }
  }, [externalOnPlayPause, playbackEngine, engineIsPlaying, currentFrame, timeline.duration, engine]);

  // High-precision playback loop when no PlaybackEngine is attached
  useEffect(() => {
    if (!internalPlaying || playbackEngine) return;
    let lastTime = performance.now();
    let rafId: number;

    const loop = (now: number) => {
      const deltaSec = (now - lastTime) / 1000;
      lastTime = now;
      const current = engine.getPlayheadFrame();
      const dur = Number(timeline.duration);
      const frameRateNum = Number(fps) || 30;
      const nextFrame = current + deltaSec * frameRateNum;

      if (nextFrame >= dur) {
        engine.seekTo(dur as any);
        setInternalPlaying(false);
        return;
      }

      engine.seekTo(Math.round(nextFrame) as any);
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [internalPlaying, playbackEngine, engine, fps, timeline.duration]);

  const handleSkipBack = useCallback(() => {
    setInternalPlaying(false);
    engine.seekTo(0 as any);
  }, [engine]);

  const handleSkipForward = useCallback(() => {
    setInternalPlaying(false);
    engine.seekTo(timeline.duration as any);
  }, [engine, timeline.duration]);

  useTimelineKeyboard({
    containerRef,
    engine,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onToolChange: (toolId) => handleToolChange(toolId as ToolId),
    onPlayPause: handlePlayPause,
    onCut: handleCut,
  });

  const isV3 = variant === 'v3';

  return (
    <div
      className={cn('tl-layout', isV3 ? 'tl-layout--v3' : 'tl-layout--v2', className)}
      ref={containerRef}
      tabIndex={0}
    >
      {/* ── Toolbar ── */}
      {showToolbar &&
        (isV3 ? (
          <TimelineToolbarV3
            currentTime={currentFrame}
            duration={timeline.duration}
            fps={fps}
            timeFormat={timeFormat}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onSkipBack={handleSkipBack}
            onSkipForward={handleSkipForward}
            onCut={handleCut}
            onDelete={selectedClipIds.size > 0 ? handleDelete : undefined}
            pages={pages}
            activePage={activePage}
            onPageChange={onPageChange}
            zoom={ppf}
            zoomMin={ZOOM_MIN}
            zoomMax={ZOOM_MAX}
            onZoomChange={handleZoomChange}
            onZoomFit={handleZoomFit}
          />
        ) : (
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
        ))}

      {/* ── Ruler ── */}
      {showRuler &&
        (isV3 ? (
          <TimelineRulerV3
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
        ) : (
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
        ))}

      {/* ── Track Area / Empty State ── */}
      {tracks.length === 0 ? (
        <div className="tl-track-area tl-track-area--empty">
          <TimelineEmptyState
            onUpload={handleDefaultUpload}
            label={emptyStateLabel}
          />
        </div>
      ) : (
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
      )}

      {/* ── Status Bar ── */}
      {showStatusBar && (
        <div className="tl-status-bar">
          <span className="tl-status-item">{fps} fps</span>
          <span className="tl-status-item">{tracks.length} tracks</span>
          <span className="tl-status-item">Frame: {currentFrame}</span>
          <span className="tl-status-item">Zoom: {ppf.toFixed(1)}px/f</span>
          <span className="tl-status-item">Selected: {selectedClipIds.size || 'none'}</span>
        </div>
      )}
    </div>
  );
}

export function TimelineLayoutV3(props: TimelineLayoutV3Props) {
  return <TimelineLayout {...props} variant="v3" />;
}
