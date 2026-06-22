/**
 * Demo Application Shell — WebPacked Timeline
 *
 * A professional timeline editor demo built on @webpacked-timeline/ui.
 * Uses the Studio preset for a clean, modern dark theme.
 */
import { useState, useEffect, useCallback } from 'react';
import { StudioEditor } from '@webpacked-timeline/ui';
import '@webpacked-timeline/ui/styles/studio';
import { engine, setEnginePixelsPerFrame, setOnZoomChange } from './engine';

import { Header } from './shell/header';
import { MediaPool, addAssetToTimeline } from './shell/media-pool';
import { Viewer } from './shell/viewer';
import { StatusBar } from './shell/status-bar';
import { KeyboardShortcuts } from './shell/keyboard-shortcuts';
import { ResizeHandle } from './shell/resize-handle';
import { ErrorBoundary } from './shell/error-boundary';

import './styles/demo.css';

const STORAGE_KEY = 'tl-upper-height';
const DEFAULT_UPPER_PCT = 35;

function getInitialUpperHeight(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const pct = parseInt(stored, 10);
      if (pct > 10 && pct < 80) {
        return (pct / 100) * window.innerHeight;
      }
    }
  } catch {
    // localStorage may not be available
  }
  return (DEFAULT_UPPER_PCT / 100) * window.innerHeight;
}

export function App() {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [upperHeight, setUpperHeight] = useState(getInitialUpperHeight);

  // ? key opens keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const handleResize = useCallback((h: number) => {
    setUpperHeight(h);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        String(Math.round((h / window.innerHeight) * 100)),
      );
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="demo-shell">
      <Header />

      <div className="demo-upper" style={{ height: upperHeight }}>
        <MediaPool engine={engine} />
        <Viewer engine={engine} />
      </div>

      <ResizeHandle onResize={handleResize} />

      <div className="demo-timeline">
        <ErrorBoundary>
          <StudioEditor
            engine={engine}
            onPpfChange={setEnginePixelsPerFrame}
            registerZoomHandler={setOnZoomChange}
            onAssetDrop={({ assetId, trackId, frame }) => addAssetToTimeline(engine, assetId, trackId, frame)}
            style={{ height: '100%' }}
          />
        </ErrorBoundary>
      </div>

      <StatusBar
        engine={engine}
        onShowShortcuts={() => setShowShortcuts(true)}
      />

      {showShortcuts && (
        <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  );
}
