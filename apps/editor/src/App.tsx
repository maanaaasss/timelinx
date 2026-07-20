import { useState, useCallback } from 'react';
import { createEditorEngine } from './createEditorEngine';
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
  const [engine] = useState(() => createEditorEngine());

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

      engine.dispatch({
        id: `drop-asset-${clipId}`,
        label: `Drop ${asset.name} onto timeline`,
        timestamp: Date.now(),
        operations: [
          { type: 'INSERT_CLIP', trackId: toTrackId(drop.trackId), clip },
        ],
      });
    },
    [engine],
  );

  return (
    <>
      <style>{globalStyle}</style>
      <div style={{ width: '100vw', height: '100vh' }}>
        <TimelineEditor
          engine={engine}
          showSidebar={true}
          showTopNav={true}
          showTransportControls={true}
          showMediaBrowser={true}
          showToolbar={true}
          projectName="Video Popular Vlog_Duplicate"
          onExport={() => console.log('Export clicked')}
          onAssetDrop={handleAssetDrop}
        />
      </div>
    </>
  );
}

export default App;
