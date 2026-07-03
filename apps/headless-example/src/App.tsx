/**
 * App — headless-example root
 *
 * This file demonstrates building a complete timeline editor UI
 * from scratch using ONLY @timelinx/core and @timelinx/react.
 * No @timelinx/ui components are used — everything is custom.
 */
import { useState, useCallback } from 'react';
import { TimelineProvider } from '@timelinx/react';
import { getEngine, resetEngine } from './lib/engine';
import { CustomTimeline } from './components/CustomTimeline';
import { CustomControls } from './components/CustomControls';

export default function App() {
  const [engine, setEngine] = useState(() => getEngine());

  const handleReset = useCallback(() => {
    resetEngine();
    setEngine(getEngine());
  }, []);

  return (
    <div className="headless-app">
      <header className="headless-header">
        <div className="headless-header-left">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="4" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="1" y="1" width="4" height="3" rx="1" fill="currentColor" opacity="0.6" />
            <rect x="7" y="1" width="4" height="3" rx="1" fill="currentColor" opacity="0.6" />
            <rect x="13" y="1" width="4" height="3" rx="1" fill="currentColor" opacity="0.6" />
          </svg>
          <span className="headless-title">timelinx</span>
          <span className="headless-badge">headless</span>
        </div>
        <p className="headless-subtitle">
          Custom UI built from scratch — no @timelinx/ui
        </p>
      </header>

      <TimelineProvider engine={engine}>
        <CustomControls engine={engine} />
        <CustomTimeline engine={engine} />
      </TimelineProvider>
    </div>
  );
}
