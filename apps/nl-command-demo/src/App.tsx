import React, { useState, useCallback, useRef } from 'react';
import type { TimelineEngine } from '@timelinx/react';
import { usePlayheadFrame, useTimelineWithEngine } from '@timelinx/react';
import { TimelineEditor, TimelineProvider, frameToTimecode } from '@timelinx/ui';
import { getEngine, resetEngine } from './lib/engine';
import { CommandInput } from './components/CommandInput';
import { SuggestionPanel } from './components/SuggestionPanel';
import { useNLU } from './lib/useNLU';
import './App.css';

export default function App() {
  const [engine] = useState(() => getEngine());
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const nlu = useNLU();

  const handleCommand = useCallback(async (command: string) => {
    setCommandHistory((prev) => [...prev, command]);
    await nlu.processCommand(command, engine);
  }, [nlu, engine]);

  const handleApplySuggestion = useCallback((id: string) => {
    nlu.applySuggestion(id, engine);
  }, [nlu, engine]);

  const handleRejectSuggestion = useCallback((id: string) => {
    nlu.rejectSuggestion(id);
  }, [nlu]);

  return (
    <div className="nl-demo-app">
      <Header engine={engine} />

      <div className="nl-demo-body">
        <div className="nl-sidebar">
          <CommandInput
            onCommand={handleCommand}
            isProcessing={nlu.isProcessing}
          />

          <SuggestionPanel
            suggestions={nlu.suggestions}
            onApply={handleApplySuggestion}
            onReject={handleRejectSuggestion}
          />

          <div className="command-history">
            <h3>Command History</h3>
            <ul>
              {commandHistory.map((cmd, i) => (
                <li key={i}>{cmd}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="nl-main">
          <TimelineProvider engine={engine}>
            <div className="timeline-wrap">
              <TimelineEditor
                engine={engine}
                style={{ height: '100%' }}
                showToolbar={true}
              />
            </div>
          </TimelineProvider>
        </div>
      </div>
    </div>
  );
}

function Header({ engine }: { engine: TimelineEngine }) {
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
          </svg>
        </div>
        <span className="app-name">timelinx</span>
        <span className="app-badge">nl-commands</span>
      </div>
      <div className="topbar-center">
        <span className="timecode topbar-timecode">{frameToTimecode(frame as number, fps)}</span>
      </div>
      <div className="topbar-right">
        <button className="icon-btn" title="Reset Workspace" onClick={handleReset}>
          ✕
        </button>
      </div>
    </header>
  );
}
