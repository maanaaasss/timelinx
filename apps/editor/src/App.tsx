import { useState } from 'react';
import { TimelineProvider } from '@timelinx/react';
import { createEditorEngine } from './createEditorEngine';
import { Toolbar } from './components/Toolbar';
import { TimelineView } from './components/TimelineView';
import { TrackLabels } from './components/TrackLabels';
import { RightPanel } from './components/RightPanel';
import { StatusBar } from './components/StatusBar';

function App() {
  const [engine] = useState(() => createEditorEngine());

  return (
    <TimelineProvider engine={engine}>
      <div className="app">
        <div className="header">
          <h1>TimelineX Editor</h1>
          <div className="header-info">Milestone 2 — Effects, Transitions, Keyframes, Captions</div>
        </div>
        <Toolbar />
        <div className="main-content">
          <TrackLabels />
          <TimelineView />
          <RightPanel />
        </div>
        <StatusBar />
      </div>
    </TimelineProvider>
  );
}

export default App;
