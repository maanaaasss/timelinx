import React, { useState, useCallback } from 'react';
import type { TimelineEngine } from '@timelinx/react';
import { usePlayheadFrame, useTimelineWithEngine } from '@timelinx/react';
import { TimelineEditor, TimelineProvider, frameToTimecode } from '@timelinx/ui';
import { getEngine, resetEngine, addAssetToTimeline } from './lib/engine';
import { IconBar, PanelId } from './components/IconBar';
import { PanelContainer } from './components/PanelContainer';
import { Viewer } from './components/Viewer';
import { useThemeManager } from './lib/useThemeManager';
import { PresetSwitcher } from './components/PresetSwitcher';
import './App.css';

export default function App() {
  const [engine] = useState(() => getEngine());
  const [activePanel, setActivePanel] = useState<PanelId>('media');
  const { currentTheme, setTheme } = useThemeManager('dark-pro');

  const handleAssetDrop = useCallback((drop: { assetId: string; trackId: string; frame: number }) => {
    addAssetToTimeline(drop);
  }, []);

  return (
    <div className="app-shell">
      <Header
        currentTheme={currentTheme}
        onThemeChange={setTheme}
        engine={engine}
      />

      <div className="app-body">
        <IconBar
          activePanel={activePanel}
          onPanelToggle={(id) => setActivePanel(id)}
        />

        <PanelContainer
          activePanel={activePanel}
          engine={engine}
          onClose={() => {}}
        />

        <div className="center-col">
          <TimelineProvider engine={engine}>
            <Viewer engine={engine} />
            <div className="timeline-wrap">
              <TimelineEditor
                engine={engine}
                style={{ height: '100%' }}
                showToolbar={true}
                onAssetDrop={handleAssetDrop}
              />
            </div>
          </TimelineProvider>
        </div>
      </div>
    </div>
  );
}

function Header({
  currentTheme,
  onThemeChange,
  engine,
}: {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  engine: TimelineEngine;
}) {
  const frame = usePlayheadFrame(engine);
  const timeline = useTimelineWithEngine(engine);
  const fps = timeline?.fps ?? 30;

  const handleReset = useCallback(() => {
    resetEngine();
    window.location.reload();
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="app-logo">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="4" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="1" y="1" width="4" height="3" rx="1" fill="currentColor" opacity="0.6" />
            <rect x="7" y="1" width="4" height="3" rx="1" fill="currentColor" opacity="0.6" />
            <rect x="13" y="1" width="4" height="3" rx="1" fill="currentColor" opacity="0.6" />
            <rect x="1" y="14" width="4" height="3" rx="1" fill="currentColor" opacity="0.6" />
            <rect x="7" y="14" width="4" height="3" rx="1" fill="currentColor" opacity="0.6" />
            <rect x="13" y="14" width="4" height="3" rx="1" fill="currentColor" opacity="0.6" />
          </svg>
        </div>
        <span className="app-name">timelinx</span>
        <span className="app-badge">demo</span>
      </div>
      <div className="topbar-center">
        <span className="timecode topbar-timecode">{frameToTimecode(frame as number, fps)}</span>
      </div>
      <div className="topbar-right">
        <PresetSwitcher
          currentTheme={currentTheme}
          onThemeChange={onThemeChange}
        />
        <button className="icon-btn" title="Reset Workspace" onClick={handleReset}>
          ✕
        </button>
      </div>
    </header>
  );
}
