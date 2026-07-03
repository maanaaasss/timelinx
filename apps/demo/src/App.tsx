import React, { useState, useCallback, useEffect } from 'react';
import type { TimelineEngine } from '@timelinx/react';
import { usePlayheadFrame, useTimelineWithEngine } from '@timelinx/react';
import {
  TimelineEditor,
  TimelineProvider,
  frameToTimecode,
  KeyboardShortcutsOverlay,
  CommandPalette,
} from '@timelinx/ui';
import { getEngine, addAssetToTimeline } from './lib/engine';
import { useThemeManager } from './lib/useThemeManager';
import { Viewer } from './components/Viewer';
import { MediaPool } from './components/MediaPool';
import { Inspector } from './components/Inspector';
import { EffectsPanel } from './components/EffectsPanel';
import {
  MarkersPanel,
  TransitionsPanel,
  KeyframesPanel,
} from '@timelinx/ui';
import { FeatureTour } from './components/FeatureTour';
import {
  Moon, Sun, Contrast, Keyboard, Command,
  Film, Info, Sparkles, Bookmark, GitMerge, Diamond,
} from 'lucide-react';
import './App.css';

/* ── Panel tab definitions ── */
const TABS = [
  { id: 'media',       label: 'Media',       icon: Film },
  { id: 'inspector',   label: 'Inspector',   icon: Info },
  { id: 'effects',     label: 'Effects',     icon: Sparkles },
  { id: 'markers',     label: 'Markers',     icon: Bookmark },
  { id: 'transitions', label: 'Transitions', icon: GitMerge },
  { id: 'keyframes',   label: 'Keyframes',   icon: Diamond },
] as const;

type TabId = typeof TABS[number]['id'];

export default function App() {
  const [engine] = useState(() => getEngine());
  const [activeTab, setActiveTab] = useState<TabId>('media');
  const { currentTheme, setTheme } = useThemeManager('dark-pro');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  const handleAssetDrop = useCallback(
    (drop: { assetId: string; trackId: string; frame: number }) => {
      addAssetToTimeline(drop);
    },
    [],
  );

  /* Global keyboard shortcuts */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA';

      if (!isInput && e.key === '?') {
        setShowShortcuts((v) => !v);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowPalette((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <TimelineProvider engine={engine}>
      <div className="app-root">

        {/* ── TOPBAR ── */}
        <Topbar
          engine={engine}
          currentTheme={currentTheme}
          onThemeChange={setTheme}
          onOpenShortcuts={() => setShowShortcuts(true)}
          onOpenPalette={() => setShowPalette(true)}
        />

        {/* ── WORKSPACE ── */}
        <div className="app-workspace">

          {/* Left panel with integrated tabs */}
          <aside className="workspace-panel">
            <div className="panel-tab-bar">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={`ptab${activeTab === id ? ' active' : ''}`}
                  onClick={() => setActiveTab(id)}
                  title={label}
                >
                  <Icon size={11} />
                  {label}
                </button>
              ))}
            </div>
            <div className="panel-body">
              {activeTab === 'media'       && <MediaPool engine={engine} />}
              {activeTab === 'inspector'   && <Inspector engine={engine} />}
              {activeTab === 'effects'     && <EffectsPanel />}
              {activeTab === 'markers'     && <MarkersPanel />}
              {activeTab === 'transitions' && <TransitionsPanel />}
              {activeTab === 'keyframes'   && <KeyframesPanel />}
            </div>
          </aside>

          {/* Program monitor */}
          <Viewer engine={engine} />
        </div>

        {/* ── TIMELINE ── */}
        <div className="app-timeline">
          <TimelineEditor
            engine={engine}
            showToolbar
            onAssetDrop={handleAssetDrop}
          />
        </div>

        {/* ── Overlays ── */}
        <KeyboardShortcutsOverlay
          isVisible={showShortcuts}
          onClose={() => setShowShortcuts(false)}
        />
        {showPalette && (
          <CommandPalette
            isVisible={showPalette}
            onClose={() => setShowPalette(false)}
          />
        )}

        <FeatureTour
          onOpenShortcuts={() => setShowShortcuts(true)}
          onOpenPalette={() => setShowPalette(true)}
        />
      </div>
    </TimelineProvider>
  );
}

/* ── Topbar ── */
const THEMES = [
  { id: 'dark-pro', label: 'Dark',   icon: Moon,     swatch: '#4F80FF' },
  { id: 'light',    label: 'Light',  icon: Sun,      swatch: '#5864F2' },
  { id: 'high-contrast', label: 'Hi-C', icon: Contrast, swatch: '#22C55E' },
] as const;

function Topbar({
  engine,
  currentTheme,
  onThemeChange,
  onOpenShortcuts,
  onOpenPalette,
}: {
  engine: TimelineEngine;
  currentTheme: string;
  onThemeChange: (t: string) => void;
  onOpenShortcuts: () => void;
  onOpenPalette: () => void;
}) {
  const frame = usePlayheadFrame(engine);
  const timeline = useTimelineWithEngine(engine);
  const fps = (timeline?.fps as number) ?? 30;

  return (
    <header className="app-topbar">
      {/* Brand */}
      <div className="topbar-brand">
        <div className="brand-logo">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect x="0.5" y="4" width="12" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
            <rect x="0.5" y="1" width="3" height="2.5" rx="0.75" fill="currentColor" opacity="0.7" />
            <rect x="5" y="1" width="3" height="2.5" rx="0.75" fill="currentColor" opacity="0.7" />
            <rect x="9.5" y="1" width="3" height="2.5" rx="0.75" fill="currentColor" opacity="0.7" />
          </svg>
        </div>
        <span className="brand-name">timelinx</span>
        <div className="brand-sep" />
        <span className="project-name">Demo Project</span>
      </div>

      <div className="topbar-spacer" />

      {/* Master timecode */}
      <div className="master-timecode">
        {frameToTimecode(frame as number, fps)}
      </div>

      <div className="topbar-spacer" />

      {/* Right actions */}
      <div className="topbar-actions">
        {/* Theme switcher */}
        <div className="theme-switcher">
          {THEMES.map(({ id, label, icon: Icon, swatch }) => (
            <button
              key={id}
              className={`theme-btn${currentTheme === id ? ' active' : ''}`}
              onClick={() => onThemeChange(id)}
              title={`${label} theme`}
            >
              <span
                className="theme-swatch"
                style={{ background: swatch }}
              />
              <Icon size={10} />
              {label}
            </button>
          ))}
        </div>

        <div className="topbar-sep" />

        {/* Keyboard shortcuts */}
        <button
          className="topbar-btn"
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts (?)"
          id="btn-kbd"
        >
          <Keyboard size={13} />
          <span className="topbar-kbd">?</span>
        </button>

        {/* Command palette */}
        <button
          className="topbar-btn"
          onClick={onOpenPalette}
          title="Command Palette (⌘K)"
          id="btn-cmd"
        >
          <Command size={13} />
          <span className="topbar-kbd">⌘K</span>
        </button>
      </div>
    </header>
  );
}
