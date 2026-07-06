import { useState, useRef, useMemo } from 'react';
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

function ClipView({ clipId }: { clipId: string }) {
  const clip = useClip(clipId);
  const selectedClipIds = useSelectedClipIds(useEngine());

  if (!clip) return null;

  const isSelected = selectedClipIds.has(clipId);
  const duration = clip.timelineEnd - clip.timelineStart;

  const clipType = clip.assetId.includes('video')
    ? 'video'
    : clip.assetId.includes('audio')
    ? 'audio'
    : 'text';

  return (
    <div
      className={`clip ${clipType} ${isSelected ? 'selected' : ''}`}
      data-clip-id={clipId}
      data-track-id={clip.trackId}
      style={{ width: Math.max(120, Number(duration) * 0.8) }}
    >
      <div className="clip-info">{clip.id}</div>
      <div className="clip-duration">{String(duration)} frames</div>
    </div>
  );
}

function TrackView({ trackId }: { trackId: string }) {
  const track = useTrack(trackId);

  if (!track) return null;

  return (
    <div className="track" data-track-id={trackId}>
      <div className="track-header">{track.name}</div>
      <div className="track-clips">
        {track.clips.map((clip) => (
          <ClipView key={clip.id} clipId={clip.id} />
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

  const ppf = useMemo(() => 2, []);

  const handlers = useToolRouter(engine, {
    getPixelsPerFrame: () => ppf,
    getScrollLeft: () => containerRef.current?.scrollLeft ?? 0,
  });

  return (
    <div className="timeline">
      <div style={{ padding: '12px', borderBottom: '1px solid #333' }}>
        <strong>{timeline.name}</strong> — {trackIds.length} tracks, {String(timeline.duration)} frames
      </div>
      <div
        ref={containerRef}
        data-timeline-container="true"
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerLeave={handlers.onPointerLeave}
        style={{ touchAction: 'none' }}
      >
        {trackIds.map((id) => (
          <TrackView key={id} trackId={id} />
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
