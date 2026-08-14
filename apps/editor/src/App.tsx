import { useState, useCallback } from 'react';
import { createEditorEngine } from './createEditorEngine';
import { createDemoEngine } from './createDemoEngine';
import { TimelineLayout, TimelineProvider } from '@timelinx/ui';
import { TimelineProvider as ReactTimelineProvider } from '@timelinx/react';
import { RightPanel } from './components/RightPanel';
import '@timelinx/ui/styles/tokens';
import '@timelinx/ui/styles/presets/dark-pro';
import '@timelinx/ui/styles/structure';

const globalStyle = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #root { height: 100%; width: 100%; overflow: hidden; }
  body { background: #1c1f26; }
`;

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

  return (
    <>
      <style>{globalStyle}</style>
      <ReactTimelineProvider engine={engine}>
        <TimelineProvider engine={engine}>
          <div style={{ display: 'flex', width: '100vw', height: '100vh', position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 296,
                zIndex: 1000,
                display: 'flex',
                gap: 6,
              }}
            >
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <TimelineLayout showToolbar={true} showRuler={true} showStatusBar={true} />
            </div>
            <RightPanel />
          </div>
        </TimelineProvider>
      </ReactTimelineProvider>
    </>
  );
}

export default App;
