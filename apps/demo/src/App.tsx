import { useState, useRef, useCallback } from 'react';
import {
  createAsset,
  createClip,
  createTrack,
  createTimeline,
  createTimelineState,
  toFrame,
  frameRate,
  toClipId,
  toTrackId,
} from '@timelinx/core';
import type { Clip } from '@timelinx/core';
import {
  TimelineEngine,
  TimelineProvider,
  useTimeline,
  useTrackIds,
  useTrack,
  useClip,
  useCanUndoRedo,
  useEngine,
  useSelectedClipIds,
  useToolRouter,
  useProvisional,
} from '@timelinx/react';

function createEditorEngine() {
  const assetVideo = createAsset({
    id: 'asset-video',
    name: 'Video.mp4',
    mediaType: 'video',
    filePath: '/media/video.mp4',
    intrinsicDuration: toFrame(6000),
    nativeFps: frameRate(30),
    sourceTimecodeOffset: toFrame(0),
  });

  const assetAudio = createAsset({
    id: 'asset-audio',
    name: 'Audio.wav',
    mediaType: 'audio',
    filePath: '/media/audio.wav',
    intrinsicDuration: toFrame(6000),
    nativeFps: frameRate(30),
    sourceTimecodeOffset: toFrame(0),
  });

  const assetText = createAsset({
    id: 'asset-text',
    name: 'Title.png',
    mediaType: 'video',
    filePath: '/media/title.png',
    intrinsicDuration: toFrame(300),
    nativeFps: frameRate(30),
    sourceTimecodeOffset: toFrame(0),
  });

  const timeline = createTimeline({
    id: 'tl-1',
    name: 'Demo Timeline',
    fps: frameRate(30),
    duration: toFrame(10800),
  });

  const videoTrack = createTrack({
    id: 'v1',
    name: 'Video Track',
    type: 'video',
  });

  const audioTrack = createTrack({
    id: 'a1',
    name: 'Audio Track',
    type: 'audio',
  });

  const titleTrack = createTrack({
    id: 't1',
    name: 'Titles',
    type: 'video',
  });

  const clip1 = createClip({
    id: 'clip-1',
    assetId: 'asset-video',
    trackId: 'v1',
    timelineStart: toFrame(0),
    timelineEnd: toFrame(300),
    mediaIn: toFrame(0),
    mediaOut: toFrame(300),
  });

  const clip2 = createClip({
    id: 'clip-2',
    assetId: 'asset-video',
    trackId: 'v1',
    timelineStart: toFrame(350),
    timelineEnd: toFrame(600),
    mediaIn: toFrame(350),
    mediaOut: toFrame(600),
  });

  const clip3 = createClip({
    id: 'clip-3',
    assetId: 'asset-audio',
    trackId: 'a1',
    timelineStart: toFrame(0),
    timelineEnd: toFrame(450),
    mediaIn: toFrame(0),
    mediaOut: toFrame(450),
  });

  const clip4 = createClip({
    id: 'clip-4',
    assetId: 'asset-text',
    trackId: 't1',
    timelineStart: toFrame(100),
    timelineEnd: toFrame(250),
    mediaIn: toFrame(0),
    mediaOut: toFrame(150),
  });

  const state = createTimelineState({
    timeline,
    assetRegistry: new Map([
      [assetVideo.id, assetVideo],
      [assetAudio.id, assetAudio],
      [assetText.id, assetText],
    ]),
  });

  const engine = new TimelineEngine({ initialState: state });

  engine.dispatch({
    id: 'init-tracks',
    label: 'Initialize tracks',
    timestamp: Date.now(),
    operations: [
      { type: 'ADD_TRACK', track: videoTrack },
      { type: 'ADD_TRACK', track: audioTrack },
      { type: 'ADD_TRACK', track: titleTrack },
    ],
  });

  engine.dispatch({
    id: 'init-clips',
    label: 'Initialize clips',
    timestamp: Date.now(),
    operations: [
      { type: 'INSERT_CLIP', trackId: toTrackId('v1'), clip: clip1 },
      { type: 'INSERT_CLIP', trackId: toTrackId('v1'), clip: clip2 },
      { type: 'INSERT_CLIP', trackId: toTrackId('a1'), clip: clip3 },
      { type: 'INSERT_CLIP', trackId: toTrackId('t1'), clip: clip4 },
    ],
  });

  return engine;
}

function UndoRedoButtons() {
  const { canUndo, canRedo } = useCanUndoRedo();
  const engine = useEngine();

  return (
    <div className="controls">
      <button
        className="button"
        disabled={!canUndo}
        onClick={() => engine.undo()}
      >
        Undo
      </button>
      <button
        className="button"
        disabled={!canRedo}
        onClick={() => engine.redo()}
      >
        Redo
      </button>
    </div>
  );
}

function SplitButton() {
  const engine = useEngine();
  const selectedClipIds = useSelectedClipIds(engine);
  const [splitPoint, setSplitPoint] = useState(150);

  const handleSplit = () => {
    if (selectedClipIds.size === 0) {
      alert('Select a clip first by clicking on it');
      return;
    }

    const clipId = Array.from(selectedClipIds)[0];
    const state = engine.getState();
    let clip = null;
    for (const track of state.timeline.tracks) {
      const found = track.clips.find(c => c.id === clipId);
      if (found) {
        clip = found;
        break;
      }
    }

    if (!clip) return;

    const splitFrame = toFrame(splitPoint);
    if (splitFrame <= clip.timelineStart || splitFrame >= clip.timelineEnd) {
      alert('Split point must be within the clip');
      return;
    }

    const clip1End = splitFrame;
    const clip2Start = splitFrame;
    const clip2MediaIn = toFrame(Number(clip.mediaIn) + Number(clip2Start - clip.timelineStart));

    engine.dispatch({
      id: 'split-clip',
      label: 'Split clip',
      timestamp: Date.now(),
      operations: [
        { type: 'DELETE_CLIP', clipId: toClipId(clipId) },
        {
          type: 'INSERT_CLIP',
          trackId: clip.trackId,
          clip: createClip({
            id: `${clipId}-part1`,
            assetId: clip.assetId,
            trackId: clip.trackId,
            timelineStart: clip.timelineStart,
            timelineEnd: clip1End,
            mediaIn: clip.mediaIn,
            mediaOut: toFrame(Number(clip.mediaIn) + Number(clip1End - clip.timelineStart)),
          }),
        },
        {
          type: 'INSERT_CLIP',
          trackId: clip.trackId,
          clip: createClip({
            id: `${clipId}-part2`,
            assetId: clip.assetId,
            trackId: clip.trackId,
            timelineStart: clip2Start,
            timelineEnd: clip.timelineEnd,
            mediaIn: clip2MediaIn,
            mediaOut: clip.mediaOut,
          }),
        },
      ],
    });
  };

  return (
    <div className="controls">
      <label style={{ fontSize: 13, color: '#888' }}>
        Split at frame:
        <input
          type="number"
          value={splitPoint}
          onChange={(e) => setSplitPoint(Number(e.target.value))}
          style={{
            marginLeft: 8,
            padding: '4px 8px',
            background: '#333',
            border: '1px solid #444',
            borderRadius: 4,
            color: '#fff',
            width: 80,
          }}
        />
      </label>
      <button className="button primary" onClick={handleSplit}>
        Split Clip
      </button>
    </div>
  );
}

const PPF = 2; // pixels per frame — shared constant

function clipLeft(clip: Clip): number {
  return Number(clip.timelineStart) * PPF;
}

function clipWidth(clip: Clip): number {
  return Math.max(60, Number(clip.timelineEnd - clip.timelineStart) * PPF);
}

function clipTypeOf(clip: Clip): 'video' | 'audio' | 'text' {
  return clip.assetId.includes('audio')
    ? 'audio'
    : clip.assetId.includes('text')
    ? 'text'
    : 'video';
}

function ClipView({
  clipId,
  isSelected,
  ghost,
}: {
  clipId: string;
  isSelected?: boolean;
  ghost?: boolean;
}) {
  const clip = useClip(clipId);
  if (!clip) return null;
  const type = clipTypeOf(clip);
  return (
    <div
      className={`clip ${type}${isSelected ? ' selected' : ''}${ghost ? ' ghost' : ''}`}
      data-clip-id={clipId}
      data-track-id={clip.trackId}
      style={{
        position: 'absolute',
        left: clipLeft(clip),
        width: clipWidth(clip),
        opacity: ghost ? 0.85 : 1,
      }}
    >
      <div className="clip-info">{clip.id}</div>
      <div className="clip-duration">{String(clip.timelineEnd - clip.timelineStart)} fr @ {String(clip.timelineStart)}</div>
    </div>
  );
}

/** Renders a ghost clip from provisional (drag-preview) data — no hook dependency needed */
function GhostClip({ clip }: { clip: Clip }) {
  const type = clipTypeOf(clip);
  return (
    <div
      className={`clip ${type} ghost`}
      style={{
        position: 'absolute',
        left: clipLeft(clip),
        width: clipWidth(clip),
        pointerEvents: 'none',
        opacity: 0.7,
        outline: '2px dashed rgba(255,255,255,0.6)',
      }}
    >
      <div className="clip-info">{clip.id} (preview)</div>
      <div className="clip-duration">{String(clip.timelineEnd - clip.timelineStart)} fr @ {String(clip.timelineStart)}</div>
    </div>
  );
}

const TRACK_CLIP_H = 60; // px

function TrackView({ trackId, selectedClipIds }: { trackId: string; selectedClipIds: ReadonlySet<string> }) {
  const track = useTrack(trackId);
  const provisional = useProvisional();

  if (!track) return null;

  // Build a map of clipId → provisional ghost clip (if any)
  const ghostMap = new Map<string, Clip>();
  if (provisional && provisional.clips.length > 0) {
    for (const c of provisional.clips) {
      if (c.trackId === trackId) {
        ghostMap.set(c.id, c as Clip);
      }
    }
  }

  return (
    <div className="track" data-track-id={trackId}>
      <div className="track-header">{track.name}</div>
      <div
        className="track-clips"
        style={{ position: 'relative', height: TRACK_CLIP_H }}
      >
        {track.clips.map((clip) => (
          <ClipView
            key={clip.id}
            clipId={clip.id}
            isSelected={selectedClipIds.has(clip.id)}
            ghost={ghostMap.has(clip.id)}
          />
        ))}
        {/* Ghost overlays show the clip's target position during drag */}
        {[...ghostMap.values()].map((ghost) => (
          <GhostClip key={`ghost-${ghost.id}`} clip={ghost} />
        ))}
      </div>
    </div>
  );
}

function TimelineView() {
  const timeline = useTimeline();
  const trackIds = useTrackIds();
  const engine = useEngine();
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedClipIds = useSelectedClipIds(engine);

  // Stable callbacks so useToolRouter doesn't recreate the tool router on every render.
  // Previously these were inline arrow functions, causing useMemo's dep array to see
  // new references each render and recreate the router — harmless for correctness
  // but wasteful. useCallback fixes this.
  const getPixelsPerFrame = useCallback(() => PPF, []);
  const getScrollLeft = useCallback(() => containerRef.current?.scrollLeft ?? 0, []);

  const handlers = useToolRouter(engine, { getPixelsPerFrame, getScrollLeft });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    console.log('[DEMO] pointerDown', {
      clientX: e.clientX,
      clientY: e.clientY,
      target: (e.target as HTMLElement)?.dataset,
    });
    handlers.onPointerDown(e);
  }, [handlers]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    handlers.onPointerMove(e);
  }, [handlers]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    console.log('[DEMO] pointerUp', { clientX: e.clientX, clientY: e.clientY });
    handlers.onPointerUp(e);
  }, [handlers]);

  const handlePointerLeave = useCallback((e: React.PointerEvent) => {
    handlers.onPointerLeave(e);
  }, [handlers]);

  return (
    <div className="timeline">
      <div style={{ padding: '12px', borderBottom: '1px solid #333' }}>
        <strong>{timeline.name}</strong> — {trackIds.length} tracks, {String(timeline.duration)} frames
      </div>
      <div
        ref={containerRef}
        data-timeline-container="true"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        style={{ touchAction: 'none', overflowX: 'auto' }}
      >
        {trackIds.map((id) => (
          <TrackView key={id} trackId={id} selectedClipIds={selectedClipIds} />
        ))}
      </div>
    </div>
  );
}

function App() {
  const [engine] = useState(() => createEditorEngine());

  return (
    <TimelineProvider engine={engine}>
      <div className="app">
        <div className="header">
          <h1>TimelineX Demo</h1>
          <UndoRedoButtons />
        </div>
        <TimelineView />
        <div className="toolbar">
          <SplitButton />
        </div>
        <div className="status">
          <div className="status-item">
            <span className="status-label">Package:</span>
            <span className="status-value">@timelinx/core@1.0.0-beta.1 + @timelinx/react@1.0.0-beta.2</span>
          </div>
          <div className="status-item">
            <span className="status-label">Source:</span>
            <span className="status-value">npm registry (not workspace)</span>
          </div>
        </div>
      </div>
    </TimelineProvider>
  );
}

export default App;
