import React, { useState, useCallback } from 'react';
import {
  createTimeline,
  createTimelineState,
  createTrack,
  createAsset,
  toFrame,
  frameRate,
} from '@timelinx/core';
import type { TimelineState, Asset, Timecode, AssetId } from '@timelinx/core';
import { usePlayheadFrame, useTimelineWithEngine } from '@timelinx/react';
import { TimelineEditor, TimelineProvider, frameToTimecode } from '@timelinx/ui';
import { VideoPreview } from './components/VideoPreview';
import { CaptionEditor } from './components/CaptionEditor';
import { OverlayPanel } from './components/OverlayPanel';

export type Caption = {
  id: string;
  text: string;
  startFrame: number;
  endFrame: number;
  style: 'default' | 'bold' | 'glow' | 'gradient';
};

export type Overlay = {
  id: string;
  type: 'text' | 'emoji' | 'sticker';
  content: string;
  x: number;
  y: number;
  size: number;
  startFrame: number;
  endFrame: number;
};

export type ExportPreset = 'reels' | 'tiktok' | 'shorts';

function createDefaultEngine(): TimelineEngine {
  const fps = frameRate(30);
  const videoAsset = createAsset({
    id: 'asset-video',
    name: 'Main Video',
    mediaType: 'video',
    intrinsicDuration: toFrame(900),
    nativeFps: fps,
    filePath: '',
    sourceTimecodeOffset: toFrame(0),
  });
  const assetRegistry = new Map<AssetId, Asset>([[videoAsset.id, videoAsset]]);
  const timeline = createTimeline({
    id: 'creator-timeline',
    name: 'Creator Project',
    fps,
    duration: toFrame(900),
    startTimecode: '01:00:00:00' as Timecode,
    tracks: [
      createTrack({ id: 'track-v1', name: 'V1', type: 'video', height: 80, clips: [] }),
      createTrack({ id: 'track-a1', name: 'A1', type: 'audio', height: 64, clips: [] }),
    ],
  });
  const state = createTimelineState({ timeline, assetRegistry });
  return new TimelineEngine({ initialState: state });
}

export default function App() {
  const [engine] = useState(() => createDefaultEngine());
  const [activePanel, setActivePanel] = useState<'captions' | 'overlays'>('captions');
  const [captions, setCaptions] = useState<Caption[]>([
    {
      id: '1',
      text: 'Welcome to Timelinx Creator',
      startFrame: 0,
      endFrame: 90,
      style: 'default',
    },
  ]);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [selectedCaption, setSelectedCaption] = useState<string | null>(null);
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);
  const [exportPreset, setExportPreset] = useState<ExportPreset>('reels');

  const handleUpdateCaption = useCallback((id: string, updates: Partial<Caption>) => {
    setCaptions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  }, []);

  const handleAddCaption = useCallback(() => {
    const newCaption: Caption = {
      id: Date.now().toString(),
      text: 'New caption',
      startFrame: 0,
      endFrame: 60,
      style: 'default',
    };
    setCaptions((prev) => [...prev, newCaption]);
    setSelectedCaption(newCaption.id);
  }, []);

  const handleDeleteCaption = useCallback((id: string) => {
    setCaptions((prev) => prev.filter((c) => c.id !== id));
    if (selectedCaption === id) setSelectedCaption(null);
  }, [selectedCaption]);

  const handleAddOverlay = useCallback((type: Overlay['type'], content: string) => {
    const newOverlay: Overlay = {
      id: Date.now().toString(),
      type,
      content,
      x: 50,
      y: 50,
      size: 48,
      startFrame: 0,
      endFrame: 150,
    };
    setOverlays((prev) => [...prev, newOverlay]);
    setSelectedOverlay(newOverlay.id);
  }, []);

  const handleUpdateOverlay = useCallback((id: string, updates: Partial<Overlay>) => {
    setOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...updates } : o))
    );
  }, []);

  const handleDeleteOverlay = useCallback((id: string) => {
    setOverlays((prev) => prev.filter((o) => o.id !== id));
    if (selectedOverlay === id) setSelectedOverlay(null);
  }, [selectedOverlay]);

  return (
    <div className="creator-app">
      <header className="creator-topbar">
        <div className="creator-topbar-left">
          <div className="creator-logo">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="5" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <rect x="5" y="8" width="4" height="4" rx="1" fill="currentColor" />
              <rect x="11" y="8" width="4" height="4" rx="1" fill="currentColor" opacity="0.6" />
            </svg>
          </div>
          <span className="creator-app-name">timelinx</span>
          <span className="creator-app-badge">creator</span>
        </div>
        <div className="creator-topbar-center">
          <div className="export-presets">
            {(['reels', 'tiktok', 'shorts'] as ExportPreset[]).map((preset) => (
              <button
                key={preset}
                className={`preset-btn ${exportPreset === preset ? 'active' : ''}`}
                onClick={() => setExportPreset(preset)}
              >
                {preset === 'reels' && '📸'}
                {preset === 'tiktok' && '🎵'}
                {preset === 'shorts' && '🎬'}
                <span>{preset.charAt(0).toUpperCase() + preset.slice(1)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="creator-topbar-right">
          <button className="export-btn">
            <span>Export</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v8M3 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      <div className="creator-body">
        <div className="creator-sidebar">
          <div className="sidebar-tabs">
            <button
              className={`sidebar-tab ${activePanel === 'captions' ? 'active' : ''}`}
              onClick={() => setActivePanel('captions')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
                <path d="M4 8h3M9 8h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span>Captions</span>
            </button>
            <button
              className={`sidebar-tab ${activePanel === 'overlays' ? 'active' : ''}`}
              onClick={() => setActivePanel('overlays')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
                <path d="M5 9.5c.5 1 1.5 1.5 3 1.5s2.5-.5 3-1.5M6.5 6v.01M9.5 6v.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span>Overlays</span>
            </button>
          </div>

          <div className="sidebar-content">
            {activePanel === 'captions' ? (
              <CaptionEditor
                captions={captions}
                selectedCaption={selectedCaption}
                onSelect={setSelectedCaption}
                onUpdate={handleUpdateCaption}
                onAdd={handleAddCaption}
                onDelete={handleDeleteCaption}
              />
            ) : (
              <OverlayPanel
                overlays={overlays}
                selectedOverlay={selectedOverlay}
                onSelect={setSelectedOverlay}
                onUpdate={handleUpdateOverlay}
                onAdd={handleAddOverlay}
                onDelete={handleDeleteOverlay}
              />
            )}
          </div>
        </div>

        <div className="creator-center">
          <VideoPreview
            captions={captions}
            overlays={overlays}
            selectedCaption={selectedCaption}
            selectedOverlay={selectedOverlay}
          />
        </div>

        <div className="creator-timeline">
          <TimelineProvider engine={engine}>
            <TimelineEditor
              engine={engine}
              style={{ height: '100%' }}
              showToolbar={true}
            />
          </TimelineProvider>
        </div>
      </div>
    </div>
  );
}