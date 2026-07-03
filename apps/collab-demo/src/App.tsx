import React, { useState, useCallback, useEffect } from 'react';
import type { TimelineEngine } from '@timelinx/react';
import { usePlayheadFrame, useTimelineWithEngine } from '@timelinx/react';
import { TimelineEditor, TimelineProvider, frameToTimecode } from '@timelinx/ui';
import {
  OperationLogStore,
  PresenceManager,
  CommentManager,
  LocalStorageAdapter,
} from '@timelinx/collab';
import { getEngine, resetEngine } from './lib/engine';
import { UserPresencePanel } from './components/UserPresencePanel';
import { CommentPanel } from './components/CommentPanel';
import { BranchPanel } from './components/BranchPanel';
import './App.css';

const USER_ID = `user-${Math.random().toString(36).slice(2, 9)}`;
const DOCUMENT_ID = 'demo-document';

export default function App() {
  const [engine] = useState(() => getEngine());
  const [operationLog] = useState(() => new OperationLogStore(DOCUMENT_ID, USER_ID));
  const [presenceManager] = useState(() => new PresenceManager(USER_ID));
  const [commentManager] = useState(() => new CommentManager(USER_ID));
  const [activeTab, setActiveTab] = useState<'users' | 'comments' | 'branches'>('users');

  // Initialize storage
  useEffect(() => {
    const storage = new LocalStorageAdapter();
    operationLog.setStorageAdapter(storage);
    operationLog.load();
    presenceManager.startHeartbeat();
    presenceManager.updateLocalPresence({
      displayName: `User ${USER_ID.slice(0, 6)}`,
    });

    return () => {
      presenceManager.stopHeartbeat();
    };
  }, [operationLog, presenceManager]);

  // Track cursor movement
  const handleTimelineClick = useCallback((frame: number) => {
    presenceManager.updateCursor(frame, null, 0, 0);
  }, [presenceManager]);

  return (
    <div className="collab-demo-app">
      <Header engine={engine} userId={USER_ID} />

      <div className="collab-demo-body">
        <div className="collab-sidebar">
          <div className="sidebar-tabs">
            <button
              className={`tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Users
            </button>
            <button
              className={`tab ${activeTab === 'comments' ? 'active' : ''}`}
              onClick={() => setActiveTab('comments')}
            >
              Comments
            </button>
            <button
              className={`tab ${activeTab === 'branches' ? 'active' : ''}`}
              onClick={() => setActiveTab('branches')}
            >
              Branches
            </button>
          </div>

          <div className="sidebar-content">
            {activeTab === 'users' && (
              <UserPresencePanel
                presenceManager={presenceManager}
                currentUserId={USER_ID}
              />
            )}
            {activeTab === 'comments' && (
              <CommentPanel
                commentManager={commentManager}
                currentUserId={USER_ID}
                engine={engine}
              />
            )}
            {activeTab === 'branches' && (
              <BranchPanel userId={USER_ID} />
            )}
          </div>
        </div>

        <div className="collab-main">
          <TimelineProvider engine={engine}>
            <div className="timeline-wrap" onClick={(e) => {
              // Simple frame tracking
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const frame = Math.floor((x / rect.width) * 300);
              handleTimelineClick(frame);
            }}>
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

function Header({ engine, userId }: { engine: TimelineEngine; userId: string }) {
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
        <span className="app-badge">collab</span>
      </div>
      <div className="topbar-center">
        <span className="timecode topbar-timecode">{frameToTimecode(frame as number, fps)}</span>
      </div>
      <div className="topbar-right">
        <span className="user-id">ID: {userId.slice(0, 8)}</span>
        <button className="icon-btn" title="Reset Workspace" onClick={handleReset}>
          ✕
        </button>
      </div>
    </header>
  );
}
