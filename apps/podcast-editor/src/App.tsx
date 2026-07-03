import React, { useState, useCallback, useMemo } from 'react';
import {
  createTimeline,
  createTimelineState,
  createTrack,
  createAsset,
  toFrame,
  frameRate,
} from '@timelinx/core';
import type { TimelineState, Asset, Timecode, AssetId } from '@timelinx/core';
import { TimelineEngine, usePlayheadFrame, useTimelineWithEngine } from '@timelinx/react';
import { TimelineEditor, TimelineProvider, frameToTimecode } from '@timelinx/ui';
import { WaveformDisplay, WaveformMarker } from './components/WaveformDisplay';
import type { WaveformSegment } from './components/WaveformDisplay';
import { TranscriptEditor } from './components/TranscriptEditor';
import type { TranscriptWord } from './components/TranscriptEditor';
import { SilenceRemover } from './components/SilenceRemover';
import type { SilenceRegion } from './components/SilenceRemover';

type SidebarPanel = 'transcript' | 'silence' | 'chapters' | 'settings';

const DEMO_SEGMENTS: WaveformSegment[] = [
  {
    id: 'seg-1',
    startMs: 0,
    endMs: 12000,
    amplitude: Array.from({ length: 120 }, (_, i) =>
      Math.sin(i * 0.3) * 0.4 + Math.random() * 0.3 + 0.2,
    ),
    color: '#31d0a2',
  },
  {
    id: 'seg-2',
    startMs: 12000,
    endMs: 15000,
    amplitude: Array.from({ length: 30 }, () => Math.random() * 0.05),
    color: '#31d0a266',
  },
  {
    id: 'seg-3',
    startMs: 15000,
    endMs: 30000,
    amplitude: Array.from({ length: 150 }, (_, i) =>
      Math.sin(i * 0.2) * 0.5 + Math.random() * 0.25 + 0.15,
    ),
    color: '#31d0a2',
  },
];

const DEMO_WORDS: TranscriptWord[] = [
  { id: 'w1', text: 'Welcome', startMs: 500, endMs: 1200, speaker: 'Host', confidence: 0.98 },
  { id: 'w2', text: 'to', startMs: 1200, endMs: 1400, speaker: 'Host', confidence: 0.99 },
  { id: 'w3', text: 'today\'s', startMs: 1400, endMs: 1900, speaker: 'Host', confidence: 0.97 },
  { id: 'w4', text: 'episode', startMs: 1900, endMs: 2500, speaker: 'Host', confidence: 0.96 },
  { id: 'w5', text: 'of', startMs: 2500, endMs: 2700, speaker: 'Host', confidence: 0.99 },
  { id: 'w6', text: 'the', startMs: 2700, endMs: 2900, speaker: 'Host', confidence: 0.99 },
  { id: 'w7', text: 'podcast.', startMs: 2900, endMs: 3500, speaker: 'Host', confidence: 0.95 },
  { id: 'w8', text: 'Today', startMs: 5200, endMs: 5600, speaker: 'Host', confidence: 0.98 },
  { id: 'w9', text: 'we', startMs: 5600, endMs: 5800, speaker: 'Host', confidence: 0.99 },
  { id: 'w10', text: 'have', startMs: 5800, endMs: 6100, speaker: 'Host', confidence: 0.98 },
  { id: 'w11', text: 'a', startMs: 6100, endMs: 6200, speaker: 'Host', confidence: 0.99 },
  { id: 'w12', text: 'special', startMs: 6200, endMs: 6700, speaker: 'Host', confidence: 0.94 },
  { id: 'w13', text: 'guest', startMs: 6700, endMs: 7200, speaker: 'Host', confidence: 0.96 },
  { id: 'w14', text: 'joining', startMs: 7200, endMs: 7700, speaker: 'Host', confidence: 0.97 },
  { id: 'w15', text: 'us.', startMs: 7700, endMs: 8100, speaker: 'Host', confidence: 0.98 },
  { id: 'w16', text: 'Thanks', startMs: 16000, endMs: 16500, speaker: 'Guest', confidence: 0.97 },
  { id: 'w17', text: 'for', startMs: 16500, endMs: 16700, speaker: 'Guest', confidence: 0.99 },
  { id: 'w18', text: 'having', startMs: 16700, endMs: 17100, speaker: 'Guest', confidence: 0.98 },
  { id: 'w19', text: 'me.', startMs: 17100, endMs: 17400, speaker: 'Guest', confidence: 0.99 },
];

const DEMO_SILENCES: SilenceRegion[] = [
  { id: 's1', startMs: 3500, endMs: 5200, amplitude: -48 },
  { id: 's2', startMs: 8100, endMs: 12000, amplitude: -52 },
  { id: 's3', startMs: 12000, endMs: 15000, amplitude: -55 },
];

const DEMO_CHAPTERS: WaveformMarker[] = [
  { id: 'ch1', timeMs: 0, label: 'Intro', color: '#31d0a2' },
  { id: 'ch2', timeMs: 15000, label: 'Main Topic', color: '#7a94ff' },
  { id: 'ch3', timeMs: 25000, label: 'Q&A', color: '#f7b955' },
];

export default function App() {
  const [engine] = useState(() => createEngine());
  const [activePanel, setActivePanel] = useState<SidebarPanel>('transcript');
  const [words, setWords] = useState<TranscriptWord[]>(DEMO_WORDS);
  const [silences, setSilences] = useState<SilenceRegion[]>(DEMO_SILENCES);
  const [chapters, setChapters] = useState<WaveformMarker[]>(DEMO_CHAPTERS);
  const [threshold, setThreshold] = useState(-40);
  const [minDurationMs, setMinDurationMs] = useState(500);

  const frame = usePlayheadFrame(engine);
  const timeline = useTimelineWithEngine(engine);
  const fps = timeline?.fps ?? 30;
  const currentTimeMs = ((frame as number) / fps) * 1000;
  const totalDurationMs = 30000;

  const handleSeek = useCallback((ms: number) => {
    const newFrame = Math.round((ms / 1000) * fps);
  }, [fps]);

  const handleMarkerAdd = useCallback((ms: number) => {
    const id = `ch-${Date.now()}`;
    setChapters((prev) => [
      ...prev,
      {
        id,
        timeMs: ms,
        label: `Chapter ${prev.length + 1}`,
        color: '#7a94ff',
      },
    ]);
  }, []);

  const handleWordClick = useCallback((word: TranscriptWord) => {
    handleSeek(word.startMs);
  }, [handleSeek]);

  const handleWordEdit = useCallback((wordId: string, newText: string) => {
    setWords((prev) =>
      prev.map((w) => (w.id === wordId ? { ...w, text: newText } : w)),
    );
  }, []);

  const handleWordDelete = useCallback((wordId: string) => {
    setWords((prev) => prev.filter((w) => w.id !== wordId));
  }, []);

  const handleTimeUpdate = useCallback(
    (wordId: string, startMs: number, endMs: number) => {
      setWords((prev) =>
        prev.map((w) =>
          w.id === wordId ? { ...w, startMs, endMs } : w,
        ),
      );
    },
    [],
  );

  const handleSilenceRemove = useCallback((ids: string[]) => {
    setSilences((prev) => prev.filter((s) => !ids.includes(s.id)));
  }, []);

  const handleSilenceTrim = useCallback(
    (id: string, startMs: number, endMs: number) => {
      setSilences((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, startMs, endMs } : s,
        ),
      );
    },
    [],
  );

  return (
    <div className="podcast-app">
      <header className="podcast-topbar">
        <div className="podcast-topbar-left">
          <div className="podcast-logo">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="4" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <rect x="3" y="7" width="2" height="4" rx="0.5" fill="currentColor" />
              <rect x="6" y="6" width="2" height="6" rx="0.5" fill="currentColor" />
              <rect x="9" y="5" width="2" height="8" rx="0.5" fill="currentColor" />
              <rect x="12" y="6.5" width="2" height="5" rx="0.5" fill="currentColor" />
              <rect x="15" y="7.5" width="2" height="3" rx="0.5" fill="currentColor" />
            </svg>
          </div>
          <span className="podcast-app-name">timelinx</span>
          <span className="podcast-badge">podcast editor</span>
        </div>

        <div className="podcast-topbar-center">
          <span className="podcast-timecode">
            {frameToTimecode(frame as number, fps)}
          </span>
          <AudioMeters currentTimeMs={currentTimeMs} />
        </div>

        <div className="podcast-topbar-right">
          <button className="podcast-header-btn" title="Import Audio">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button className="podcast-header-btn" title="Export">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </button>
        </div>
      </header>

      <div className="podcast-body">
        <nav className="podcast-sidebar">
          <button
            className={`podcast-sidebar-btn ${activePanel === 'transcript' ? 'active' : ''}`}
            onClick={() => setActivePanel('transcript')}
            title="Transcript"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </button>
          <button
            className={`podcast-sidebar-btn ${activePanel === 'silence' ? 'active' : ''}`}
            onClick={() => setActivePanel('silence')}
            title="Silence Removal"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="8" y1="12" x2="8" y2="6" />
              <line x1="10" y1="12" x2="10" y2="10" />
              <line x1="12" y1="12" x2="12" y2="4" />
              <line x1="14" y1="12" x2="14" y2="8" />
              <line x1="16" y1="12" x2="16" y2="6" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          </button>
          <button
            className={`podcast-sidebar-btn ${activePanel === 'chapters' ? 'active' : ''}`}
            onClick={() => setActivePanel('chapters')}
            title="Chapters"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </button>
        </nav>

        <div className="podcast-main">
          <div className="waveform-section">
            <div className="waveform-header">
              <span className="waveform-header-label">Waveform</span>
              <div className="waveform-header-meta">
                <span className="waveform-meta-item">
                  44.1 kHz / 16-bit / Stereo
                </span>
                <span className="waveform-meta-item">
                  {formatDuration(totalDurationMs)}
                </span>
              </div>
            </div>

            <WaveformDisplay
              segments={DEMO_SEGMENTS}
              durationMs={totalDurationMs}
              currentTimeMs={currentTimeMs}
              markers={chapters}
              onSeek={handleSeek}
              onMarkerAdd={handleMarkerAdd}
            />

            <div className="chapter-bar">
              {chapters.map((ch) => (
                <button
                  key={ch.id}
                  className="chapter-marker"
                  onClick={() => handleSeek(ch.timeMs)}
                >
                  <span className="chapter-marker-dot" style={{ background: ch.color }} />
                  <span>{ch.label}</span>
                  <span className="chapter-marker-time">
                    {formatDuration(ch.timeMs)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="podcast-bottom">
            <div className="transcript-panel">
              <TranscriptEditor
                words={words}
                currentTimeMs={currentTimeMs}
                onWordClick={handleWordClick}
                onWordEdit={handleWordEdit}
                onWordDelete={handleWordDelete}
                onTimeUpdate={handleTimeUpdate}
              />
            </div>

            <div className="tools-panel">
              <div className="tab-bar">
                <button
                  className={`tab-btn ${activePanel === 'silence' ? 'active' : ''}`}
                  onClick={() => setActivePanel('silence')}
                >
                  Silence
                </button>
                <button
                  className={`tab-btn ${activePanel === 'chapters' ? 'active' : ''}`}
                  onClick={() => setActivePanel('chapters')}
                >
                  Chapters
                </button>
              </div>

              {activePanel === 'silence' && (
                <SilenceRemover
                  silences={silences}
                  onRemove={handleSilenceRemove}
                  onTrim={handleSilenceTrim}
                  threshold={threshold}
                  onThresholdChange={setThreshold}
                  minDurationMs={minDurationMs}
                  onMinDurationChange={setMinDurationMs}
                />
              )}

              {activePanel === 'chapters' && (
                <ChapterPanel
                  chapters={chapters}
                  onSeek={handleSeek}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AudioMeters({ currentTimeMs }: { currentTimeMs: number }) {
  const leftLevel = useMemo(() => {
    return Math.abs(Math.sin(currentTimeMs * 0.001)) * 0.7 + 0.1;
  }, [currentTimeMs]);

  const rightLevel = useMemo(() => {
    return Math.abs(Math.sin(currentTimeMs * 0.0012 + 0.5)) * 0.65 + 0.12;
  }, [currentTimeMs]);

  return (
    <div className="audio-meters">
      <div className="meter-channel">
        <div className="meter-bar-container">
          <div
            className={`meter-bar-fill ${leftLevel > 0.9 ? 'red' : leftLevel > 0.7 ? 'yellow' : 'green'}`}
            style={{ height: `${leftLevel * 100}%` }}
          />
        </div>
        <span className="meter-label">L</span>
      </div>
      <div className="meter-channel">
        <div className="meter-bar-container">
          <div
            className={`meter-bar-fill ${rightLevel > 0.9 ? 'red' : rightLevel > 0.7 ? 'yellow' : 'green'}`}
            style={{ height: `${rightLevel * 100}%` }}
          />
        </div>
        <span className="meter-label">R</span>
      </div>
    </div>
  );
}

function ChapterPanel({
  chapters,
  onSeek,
}: {
  chapters: WaveformMarker[];
  onSeek: (ms: number) => void;
}) {
  return (
    <div className="silence-remover">
      <div className="silence-header">
        <span className="silence-title">Chapters</span>
        <span className="silence-count">{chapters.length} markers</span>
      </div>

      <div className="silence-list">
        {chapters.map((ch) => (
          <div
            key={ch.id}
            className="silence-region"
            onClick={() => onSeek(ch.timeMs)}
          >
            <div className="silence-region-info">
              <span className="silence-time">{ch.label}</span>
              <span className="silence-duration">
                {formatDuration(ch.timeMs)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function createEngine() {
  const fps = frameRate(30);
  const audioAsset = createAsset({
    id: 'asset-audio',
    name: 'Podcast Audio',
    mediaType: 'audio',
    intrinsicDuration: toFrame(900),
    nativeFps: fps,
    filePath: '',
    sourceTimecodeOffset: toFrame(0),
  });
  const assetRegistry = new Map<AssetId, Asset>([[audioAsset.id, audioAsset]]);
  const timeline = createTimeline({
    id: 'podcast-timeline',
    name: 'Podcast Episode',
    fps,
    duration: toFrame(900),
    startTimecode: '01:00:00:00' as Timecode,
    tracks: [
      createTrack({ id: 'track-a1', name: 'A1', type: 'audio', height: 64, clips: [] }),
    ],
  });
  const state = createTimelineState({ timeline, assetRegistry });
  return new TimelineEngine({ initialState: state });
}

function formatDuration(ms: number) {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
