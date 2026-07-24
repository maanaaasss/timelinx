import { useState, useCallback } from 'react';
import { createEditorEngine } from './createEditorEngine';
import { createDemoEngine } from './createDemoEngine';
import { TimelineEditor } from '@timelinx/ui';
import { createClip, toFrame, toClipId, toTrackId, toAssetId } from '@timelinx/core';
import '@timelinx/ui/styles/tokens';
import '@timelinx/ui/styles/presets/dark-pro';
import '@timelinx/ui/styles/structure';

const globalStyle = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #root { height: 100%; width: 100%; overflow: hidden; }
  body { background: #1c1f26; }
`;

let _clipSeq = 0;

function App() {
  const [engine, setEngine] = useState(() => createEditorEngine());
  const [isDemoMode, setIsDemoMode] = useState(false);

  const handleLoadDemo = useCallback(() => {
    setEngine(createDemoEngine());
    setIsDemoMode(true);
  }, []);

  const handleLoadBlank = useCallback(() => {
    setEngine(createEditorEngine());
    setIsDemoMode(false);
  }, []);

  const handleAssetDrop = useCallback(
    (drop: { assetId: string; trackId: string; frame: number }) => {
      const state = engine.getState();
      const asset = state.assetRegistry.get(toAssetId(drop.assetId));
      if (!asset) return;

      const duration = asset.intrinsicDuration as number;
      const startFrame = drop.frame;
      const endFrame = startFrame + duration;

      const clipId = toClipId(`clip-drop-${Date.now()}-${++_clipSeq}`);
      const clip = createClip({
        id: clipId,
        assetId: drop.assetId,
        trackId: drop.trackId,
        timelineStart: toFrame(startFrame),
        timelineEnd: toFrame(endFrame),
        mediaIn: toFrame(0),
        mediaOut: toFrame(duration),
      });

      const currentDuration = state.timeline.duration as number;
      const newDuration = Math.max(currentDuration, endFrame);

      engine.dispatch({
        id: `drop-asset-${clipId}`,
        label: `Drop ${asset.name} onto timeline`,
        timestamp: Date.now(),
        operations: [
          { type: 'INSERT_CLIP', trackId: toTrackId(drop.trackId), clip },
          ...(newDuration > currentDuration
            ? [{ type: 'SET_TIMELINE_DURATION' as const, duration: toFrame(newDuration) }]
            : []),
        ],
      });
    },
    [engine],
  );

  return (
    <>
      <style>{globalStyle}</style>
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1000,
          display: 'flex',
          gap: 6,
        }}>
          <button
            onClick={isDemoMode ? handleLoadBlank : handleLoadDemo}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              background: isDemoMode ? '#e74c3c' : '#2d72d2',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              opacity: 0.8,
            }}
            title={isDemoMode ? 'Switch to blank timeline' : 'Load demo content for testing'}
          >
            {isDemoMode ? '✕ Exit Demo' : '▶ Load Demo'}
          </button>
        </div>
        <TimelineEditor
          engine={engine}
          showSidebar={true}
          showTopNav={true}
          showTransportControls={true}
          showMediaBrowser={true}
          showToolbar={true}
          projectName="Video Popular Vlog_Duplicate"
          onAssetDrop={handleAssetDrop}
        />
      </div>
    </>
  );
}

export default App;
