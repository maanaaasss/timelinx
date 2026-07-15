import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  useTrackIdsWithEngine,
  useTimelineWithEngine,
  usePlayheadFrame,
  useIsPlaying,
  useActiveToolId,
  useProvisionalWithEngine,
  useSelectedClipIds,
  useCursor,
  useVirtualWindow,
  useTrackWithEngine,
  useClips,
  useHistory,
} from '@timelinx/react';
import type { TimelineEngine } from '@timelinx/react';
import type {
  TimelinePointerEvent,
  TimelineKeyEvent,
  Modifiers,
  ClipId,
  TrackId,
  ProvisionalState,
  OperationPrimitive,
} from '@timelinx/core';
import { toFrame, createTrack, createClip, toAssetId, createAsset, frameRate, toTrackId } from '@timelinx/core';
import { TimelineProvider, useTimelineContext, TimelineCtx } from '../context/timeline-context';
import { TimelineRuler } from './timeline-ruler';
import { TimelineTrack } from './timeline-track';
import { TimelineClip } from './timeline-clip';
import { TimelinePlayhead } from './timeline-playhead';
import { TimelineToolbar } from './timeline-toolbar';
import { ZoomControls } from './zoom-controls';
import { SnapIndicator } from './snap-indicator';
import { DropZone } from './drop-zone';
import { Sidebar } from './sidebar';
import { TopNav } from './top-nav';
import { TransportControls } from './transport-controls';
import { AssetBin } from './asset-bin';
import { frameToTimecode, getFriendlyTrackLabel } from '../shared/time';

const DEFAULT_TRACK_HEIGHT_VIDEO = 80;
const DEFAULT_TRACK_HEIGHT_AUDIO = 68;
const MIN_TRACK_HEIGHT = 36;
const MAX_TRACK_HEIGHT = 140;

let _txSeq = 0;
const txId = () => `ui-tx-${++_txSeq}`;

function extractModifiers(e: React.PointerEvent | React.KeyboardEvent): Modifiers {
  return { shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey, meta: e.metaKey };
}

const ClipRow = React.memo(function ClipRow({
  trackId,
  ppf,
  provisional,
  selection,
  toolId,
  height,
  fps,
  startFrame,
  endFrame,
  trackType,
}: {
  trackId: string;
  ppf: number;
  provisional: ProvisionalState | null;
  selection: ReadonlySet<string>;
  toolId: string;
  height: number;
  fps: number;
  startFrame: number;
  endFrame: number;
  trackType?: string;
}) {
  const { engine } = useTimelineContext();
  const track = useTrackWithEngine(engine, trackId);
  const clips = useClips(engine, trackId);

  if (!track) return null;
  const isAudio = track.type === 'audio';

  const provisionalClips = provisional?.clips ?? [];
  const provisionalIds = new Set(provisionalClips.map((pc) => pc.id as string));

  return (
    <div
      className={`tl-track tl-track--${trackType || 'video'}`}
      data-track-id={trackId}
      style={{
        height,
      }}
    >
      <div className="tl-track-body">
        {clips.map((clip) => {
          const isGhost = provisionalIds.has(clip.id as string);
          const ghostClip = isGhost
            ? provisionalClips.find((pc) => pc.id === clip.id)
            : null;
          return (
            <TimelineClip
              key={clip.id as string}
              clip={ghostClip ?? clip}
              trackId={trackId}
              isAudio={isAudio}
              ppf={ppf}
              height={height}
              isSelected={selection.has(clip.id as string)}
              isProvisional={isGhost}
              trackType={trackType}
              fps={fps}
            />
          );
        })}
      </div>
    </div>
  );
});

export interface TimelineEditorProps {
  engine: TimelineEngine;
  initialPpf?: number;
  onPpfChange?: (ppf: number) => void;
  registerZoomHandler?: (handler: (ppf: number) => void) => void;
  onAssetDrop?: (drop: { assetId: string; trackId: string; frame: number }) => void;
  className?: string;
  style?: React.CSSProperties;
  showToolbar?: boolean;
  showSidebar?: boolean;
  showTopNav?: boolean;
  showTransportControls?: boolean;
  showMediaBrowser?: boolean;
  projectName?: string;
  onExport?: () => void;
}

export function TimelineEditor({
  engine,
  initialPpf = 4,
  onPpfChange,
  registerZoomHandler,
  onAssetDrop,
  className,
  style,
  showToolbar = true,
  showSidebar = true,
  showTopNav = true,
  showTransportControls = true,
  showMediaBrowser = true,
  projectName,
  onExport,
}: TimelineEditorProps) {
  const hasContext = React.useContext(TimelineCtx) !== null;

  const content = (
    <EditorInner
      registerZoomHandler={registerZoomHandler}
      onAssetDrop={onAssetDrop}
      className={className}
      style={style}
      showToolbar={showToolbar}
      showSidebar={showSidebar}
      showTopNav={showTopNav}
      showTransportControls={showTransportControls}
      showMediaBrowser={showMediaBrowser}
      projectName={projectName}
      onExport={onExport}
    />
  );

  if (hasContext) {
    return content;
  }

  return (
    <TimelineProvider engine={engine} initialPpf={initialPpf} onPpfChange={onPpfChange}>
      {content}
    </TimelineProvider>
  );
}

function EditorInner({
  registerZoomHandler,
  onAssetDrop,
  className,
  style,
  showToolbar,
  showSidebar,
  showTopNav,
  showTransportControls,
  showMediaBrowser,
  projectName,
  onExport,
}: {
  registerZoomHandler?: (handler: (ppf: number) => void) => void;
  onAssetDrop?: (drop: { assetId: string; trackId: string; frame: number }) => void;
  className?: string;
  style?: React.CSSProperties;
  showToolbar?: boolean;
  showSidebar?: boolean;
  showTopNav?: boolean;
  showTransportControls?: boolean;
  showMediaBrowser?: boolean;
  projectName?: string;
  onExport?: () => void;
}) {
  const {
    engine,
    ppf,
    ppfRef,
    setPpf,
    scrollLeft,
    scrollRef,
    setScrollLeft,
    vpWidth,
    setVpWidth,
    labelWidth,
  } = useTimelineContext();

  const [, forceUpdate] = useState(0);
  const triggerUpdate = useCallback(() => forceUpdate((n) => n + 1), []);

  const trackAreaRef = useRef<HTMLDivElement>(null);
  const trackScrollRef = useRef<HTMLDivElement>(null);
  const labelColumnRef = useRef<HTMLDivElement>(null);
  const handDragRef = useRef<{ startX: number; startScroll: number } | null>(null);
  const resizeDragRef = useRef<{ trackId: string; startY: number; startHeight: number } | null>(null);

  const [trackHeights, setTrackHeights] = useState<Record<string, number>>({});
  const [dropTarget, setDropTarget] = useState<{ trackId: string; frame: number } | null>(null);
  const [timelineHeight, setTimelineHeight] = useState(320);
  const timelineResizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const trackIds = useTrackIdsWithEngine(engine);
  const timeline = useTimelineWithEngine(engine);
  const frame = usePlayheadFrame(engine);
  const isPlaying = useIsPlaying(engine);
  const toolId = useActiveToolId(engine);
  const provisional = useProvisionalWithEngine(engine);
  const selection = useSelectedClipIds(engine);
  const cursor = useCursor(engine);
  const virtualWindow = useVirtualWindow(engine, vpWidth, scrollLeft, ppf);
  const history = useHistory(engine);

  const frameRef = useRef(frame);
  frameRef.current = frame;
  const durationFramesRef = useRef(timeline.duration as number);
  durationFramesRef.current = timeline.duration as number;

  const fps = timeline.fps as number;
  const durationFrames = timeline.duration as number;

  const snapFrames = useMemo(() => {
    if (!provisional?.clips?.length) return [];
    const state = engine.getState();
    const committedEdges = new Set<number>();
    const committedClipMap = new Map<string, { start: number; end: number }>();
    for (const track of state.timeline.tracks) {
      for (const clip of track.clips) {
        const s = clip.timelineStart as number;
        const e = clip.timelineEnd as number;
        committedEdges.add(s);
        committedEdges.add(e);
        committedClipMap.set(clip.id as string, { start: s, end: e });
      }
    }
    committedEdges.add(frame as number);
    const snapped = new Set<number>();
    for (const pc of provisional.clips) {
      const committed = committedClipMap.get(pc.id as string);
      if (!committed) continue;
      const ps = pc.timelineStart as number;
      const pe = pc.timelineEnd as number;
      if (ps !== committed.start && committedEdges.has(ps)) snapped.add(ps);
      if (pe !== committed.end && committedEdges.has(pe)) snapped.add(pe);
    }
    return Array.from(snapped);
  }, [provisional, frame, engine]);

  const trackTypesMap = useMemo(() => {
    const map = new Map<string, string>();
    const state = engine.getState();
    for (const t of state.timeline.tracks) {
      map.set(t.id as string, t.type);
    }
    return map;
  }, [trackIds, engine.getState().timeline.tracks]);

  const getTrackHeight = useCallback(
    (trackId: string) => {
      if (trackHeights[trackId] !== undefined) return trackHeights[trackId];
      const type = trackTypesMap.get(trackId);
      return type === 'video' ? DEFAULT_TRACK_HEIGHT_VIDEO : DEFAULT_TRACK_HEIGHT_AUDIO;
    },
    [trackHeights, trackTypesMap],
  );

  const totalTrackHeight = useMemo(
    () => trackIds.reduce((sum, tid) => sum + getTrackHeight(tid), 0),
    [trackIds, getTrackHeight],
  );

  const clipCounts = useMemo(() => {
    const map = new Map<string, number>();
    const state = engine.getState();
    for (const t of state.timeline.tracks) {
      map.set(t.id as string, t.clips.length);
    }
    return map;
  }, [trackIds, provisional, engine.getState().timeline.tracks]);

  useEffect(() => {
    const el = trackScrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setVpWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [setVpWidth]);

  useEffect(() => {
    registerZoomHandler?.(setPpf);
  }, [registerZoomHandler, setPpf]);

  useEffect(() => {
    const editorEl = document.querySelector('.timeline-editor') as HTMLElement | null;
    if (editorEl) {
      editorEl.focus({ preventScroll: true });
    }
  }, []);

  const handleEditorClick = useCallback(() => {
    const editorEl = document.querySelector('.timeline-editor') as HTMLElement | null;
    if (editorEl && document.activeElement !== editorEl) {
      editorEl.focus({ preventScroll: true });
    }
  }, []);

  useEffect(() => {
    const playheadX = (frame as number) * ppfRef.current;
    const viewStart = scrollRef.current;
    const viewEnd = viewStart + vpWidth;
    if (playheadX > viewEnd - 80 || playheadX < viewStart + 20) {
      const newScroll = Math.max(0, playheadX - vpWidth * 0.2);
      if (trackScrollRef.current) {
        trackScrollRef.current.scrollLeft = newScroll;
      }
      setScrollLeft(newScroll);
    }
  }, [frame, vpWidth, setScrollLeft, ppfRef, scrollRef]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (resizeDragRef.current) {
        const dy = e.clientY - resizeDragRef.current.startY;
        const newH = Math.max(MIN_TRACK_HEIGHT, Math.min(MAX_TRACK_HEIGHT, resizeDragRef.current.startHeight + dy));
        setTrackHeights((prev) => ({ ...prev, [resizeDragRef.current!.trackId]: newH }));
      }
      if (timelineResizeRef.current) {
        const dy = timelineResizeRef.current.startY - e.clientY;
        const newH = Math.max(160, Math.min(600, timelineResizeRef.current.startHeight + dy));
        setTimelineHeight(newH);
      }
    };
    const onUp = () => {
      resizeDragRef.current = null;
      timelineResizeRef.current = null;
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, []);

  const convertEvent = useCallback(
    (e: React.PointerEvent): TimelinePointerEvent => {
      const currentPpf = ppfRef.current;
      const rect = trackAreaRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const f = Math.max(0, Math.round(x / currentPpf));

      let clipId: string | null = null;
      let trackId: string | null = null;
      let clipEl: HTMLElement | null = null;

      let el = e.target as HTMLElement | null;
      while (el && el !== trackAreaRef.current) {
        if (!clipId && el.dataset.clipId) {
          clipId = el.dataset.clipId;
          clipEl = el;
        }
        if (!trackId && el.dataset.trackId) {
          trackId = el.dataset.trackId;
        }
        if (clipId && trackId) break;
        el = el.parentElement;
      }

      let edge: 'left' | 'right' | 'none' = 'none';
      if (clipEl) {
        const cr = clipEl.getBoundingClientRect();
        const lx = e.clientX - cr.left;
        const thresh = Math.min(8, cr.width * 0.2);
        edge = lx <= thresh ? 'left' : lx >= cr.width - thresh ? 'right' : 'none';
      }

      return {
        x,
        y,
        frame: toFrame(f),
        buttons: e.buttons,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        clipId: clipId as ClipId | null,
        trackId: trackId as TrackId | null,
        captionId: null,
        edge,
      };
    },
    [ppfRef],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const currentToolId = engine.getActiveToolId();
      if (currentToolId === 'hand') {
        handDragRef.current = { startX: e.clientX, startScroll: scrollRef.current };
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        return;
      }
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      engine.handlePointerDown(convertEvent(e), extractModifiers(e));
      triggerUpdate();
    },
    [engine, convertEvent, triggerUpdate, scrollRef],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const currentToolId = engine.getActiveToolId();
      if (currentToolId === 'hand' && handDragRef.current && e.buttons & 1) {
        const dx = e.clientX - handDragRef.current.startX;
        const maxScroll = Math.max(0, durationFrames * ppfRef.current - vpWidth);
        const newScroll = Math.max(0, Math.min(maxScroll, handDragRef.current.startScroll - dx));
        setScrollLeft(newScroll);
        if (trackScrollRef.current) {
          trackScrollRef.current.scrollLeft = newScroll;
        }
        return;
      }
      if (!(e.buttons & 1)) return;
      engine.handlePointerMove(convertEvent(e), extractModifiers(e));
      triggerUpdate();
    },
    [engine, convertEvent, triggerUpdate, setScrollLeft, durationFrames, vpWidth, ppfRef],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const currentToolId = engine.getActiveToolId();
      if (currentToolId === 'hand') {
        handDragRef.current = null;
        return;
      }
      engine.handlePointerUp(convertEvent(e), extractModifiers(e));
      triggerUpdate();
    },
    [engine, convertEvent, triggerUpdate],
  );

  const onPointerLeave = useCallback(
    (e: React.PointerEvent) => {
      const currentToolId = engine.getActiveToolId();
      if (currentToolId === 'hand') {
        handDragRef.current = null;
        return;
      }
      const evt = convertEvent(e);
      engine.handlePointerUp(evt, extractModifiers(e));
      engine.handlePointerLeave(evt);
    },
    [engine, convertEvent],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const toolKeys: Record<string, string> = {
        v: 'selection',
        c: 'razor',
        t: 'ripple-trim',
        r: 'roll-trim',
        s: 'slip',
        y: 'slide',
        h: 'hand',
      };
      if (!e.metaKey && !e.ctrlKey && !e.altKey && toolKeys[e.key.toLowerCase()]) {
        e.preventDefault();
        engine.activateTool(toolKeys[e.key.toLowerCase()]);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        e.shiftKey ? engine.redo() : engine.undo();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const sel = engine.getSnapshot().selectedClipIds;
        if (sel.size > 0) {
          e.preventDefault();
          const ops: OperationPrimitive[] = [];
          for (const cid of sel) {
            ops.push({ type: 'DELETE_CLIP', clipId: cid as ClipId });
          }
          if (ops.length > 0) {
            engine.dispatch({
              id: `delete-${Date.now()}`,
              label: 'Delete clips',
              timestamp: Date.now(),
              operations: ops,
            });
            engine.clearSelection();
          }
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        engine.seekTo(toFrame(Math.max(0, (frameRef.current as number) - step)));
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        engine.seekTo(toFrame(Math.min(durationFramesRef.current - 1, (frameRef.current as number) + step)));
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        isPlaying ? engine.playbackEngine?.pause() : engine.playbackEngine?.play();
        return;
      }

      if (e.key === 'Home') {
        e.preventDefault();
        engine.seekTo(toFrame(0));
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        engine.seekTo(toFrame(durationFramesRef.current - 1));
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        engine.clearSelection();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        const allIds = new Set<string>();
        for (const trk of engine.getState().timeline.tracks) {
          for (const c of trk.clips) allIds.add(c.id as string);
        }
        engine.setSelectedClipIds(allIds);
        return;
      }

      const keyEvt: TimelineKeyEvent = {
        code: e.code,
        key: e.key,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        repeat: e.repeat,
      };
      const handled = engine.handleKeyDown(keyEvt, extractModifiers(e));
      if (handled) e.preventDefault();
    },
    [engine, isPlaying],
  );

  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const sl = Math.max(0, e.currentTarget.scrollLeft);
      const maxScroll = Math.max(0, durationFrames * ppfRef.current - vpWidth);
      const clampedScroll = Math.min(sl, maxScroll);
      setScrollLeft(clampedScroll);
      // Sync label column vertical scroll
      if (labelColumnRef.current) {
        labelColumnRef.current.scrollTop = e.currentTarget.scrollTop;
      }
    },
    [setScrollLeft, vpWidth, durationFrames, ppfRef],
  );

  const getDropTarget = useCallback((e: React.DragEvent) => {
    const area = trackAreaRef.current;
    if (!area) return null;
    let el = e.target as HTMLElement | null;
    let trackId: string | null = null;
    while (el && el !== area) {
      if (el.dataset.trackId) {
        trackId = el.dataset.trackId;
        break;
      }
      el = el.parentElement;
    }
    if (!trackId) return null;
    const rect = area.getBoundingClientRect();
    return {
      trackId,
      frame: Math.max(0, Math.min(durationFrames - 1, Math.round((e.clientX - rect.left) / ppfRef.current))),
    };
  }, [durationFrames, ppfRef]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!onAssetDrop) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDropTarget(getDropTarget(e));
  }, [getDropTarget, onAssetDrop]);

  const onDrop = useCallback((e: React.DragEvent) => {
    if (!onAssetDrop) return;
    e.preventDefault();
    const target = getDropTarget(e);
    const assetId = e.dataTransfer.getData('application/x-timeline-asset');
    setDropTarget(null);
    if (target && assetId) onAssetDrop({ assetId, ...target });
  }, [getDropTarget, onAssetDrop]);

  const timelineWidth = Math.max(durationFrames * ppf, vpWidth);
  const firstAudioIdx = trackIds.findIndex((tid) => trackTypesMap.get(tid) === 'audio');

  return (
    <div
      className={`timeline-editor${className ? ` ${className}` : ''}`}
      role="application"
      aria-label="Timeline editor"
      style={style}
      onKeyDown={onKeyDown}
      onClick={handleEditorClick}
      tabIndex={0}
    >
      {/* Left Sidebar */}
      {showSidebar && <Sidebar />}

      {/* Main Content Area */}
      <main className="timeline-main">
        {/* Top Navigation Bar */}
        {showTopNav && <TopNav projectName={projectName} onExport={onExport} />}

        {/* Workspace Split: Media Browser + Preview */}
        <div className="timeline-workspace-split">
          {/* Media Browser */}
          {showMediaBrowser && (
            <div className="timeline-media-browser">
              <AssetBin onAssetDrop={onAssetDrop} />
            </div>
          )}

          {/* Video Preview + Transport Controls */}
          <div className="timeline-preview-area">
            <div className="preview-panel">
              <div className="preview-frame" style={{ aspectRatio: '21/9', maxWidth: '800px', width: '100%' }}>
                <div className="preview-safe-area" />
                <div className="preview-timecode" style={{ position: 'absolute', bottom: 8, left: 10 }}>
                  {frameToTimecode(frame as number, fps)}
                </div>
              </div>
            </div>
            {showTransportControls && <TransportControls />}
          </div>
        </div>

        {/* Timeline Area */}
        <div className="timeline-area" style={{ height: timelineHeight }}>
          {/* Resize handle */}
          <div
            className="timeline-resize-handle"
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture?.(e.pointerId);
              timelineResizeRef.current = { startY: e.clientY, startHeight: timelineHeight };
            }}
          />
          {showToolbar && <TimelineToolbar />}

          <div className="timeline-workspace-split">
            {/* Left: Track Labels */}
            <div ref={labelColumnRef} className="timeline-label-column">
              <div className="timeline-label-header">
                <span className="timecode">
                  {frameToTimecode(frame as number, fps)}
                </span>
              </div>

              {trackIds.map((tid, i) => {
                const h = getTrackHeight(tid);
                const type = trackTypesMap.get(tid) ?? 'video';
                const friendlyLabel = getFriendlyTrackLabel(tid, type, trackIds, trackTypesMap);
                const isSep = firstAudioIdx > 0 && i === firstAudioIdx;
                return (
                  <div key={tid} style={{ position: 'relative' }}>
                    {isSep && <div className="timeline-track-separator" />}
                    <TimelineTrack
                      trackId={tid}
                      shortId={friendlyLabel}
                      height={h}
                      clipCount={clipCounts.get(tid) ?? 0}
                    />
                    <div
                      role="separator"
                      aria-orientation="horizontal"
                      aria-label={`Resize ${tid}`}
                      tabIndex={0}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 4,
                        cursor: 'row-resize',
                        zIndex: 3,
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        resizeDragRef.current = { trackId: tid, startY: e.clientY, startHeight: h };
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Right: Tracks (scrollable, ruler sticky inside) */}
            <div className="timeline-scroll-area">
              <div
                className="timeline-track-scroll"
                ref={trackScrollRef}
                onScroll={onScroll}
              >
              <TimelineRuler totalWidth={timelineWidth} />
              <div
                ref={trackAreaRef}
                className="timeline-track-canvas"
                style={{
                  width: Math.max(timelineWidth, vpWidth),
                  minHeight: totalTrackHeight,
                  cursor:
                    toolId === 'hand'
                      ? handDragRef.current
                        ? 'grabbing'
                        : 'grab'
                      : cursor,
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerLeave}
                onDragOver={onDragOver}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropTarget(null);
                }}
                onDrop={onDrop}
              >
                {trackIds.map((tid, i) => {
                  const isSep = firstAudioIdx > 0 && i === firstAudioIdx;
                  return (
                    <React.Fragment key={tid}>
                      {isSep && <div className="timeline-track-separator" />}
                      <ClipRow
                        trackId={tid}
                        ppf={ppf}
                        provisional={provisional}
                        selection={selection}
                        toolId={toolId}
                        height={getTrackHeight(tid)}
                        fps={fps}
                        startFrame={virtualWindow.startFrame as number}
                        endFrame={virtualWindow.endFrame as number}
                        trackType={trackTypesMap.get(tid)}
                      />
                    </React.Fragment>
                  );
                })}

                <SnapIndicator
                  frames={snapFrames}
                  ppf={ppf}
                  totalHeight={totalTrackHeight}
                />

                {dropTarget && (
                  <DropZone
                    frame={dropTarget.frame}
                    ppf={ppf}
                    totalHeight={totalTrackHeight}
                    fps={fps}
                  />
                )}

                <TimelinePlayhead totalHeight={totalTrackHeight} topOffset={0} />
              </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
