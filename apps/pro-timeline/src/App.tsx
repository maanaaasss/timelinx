import React, { useState, useCallback } from 'react';
import { toFrame } from '@timelinx/core';
import type { TimelineEngine } from '@timelinx/react';
import {
  usePlayheadFrame,
  useTimelineWithEngine,
  useIsPlaying,
  usePlaybackEngine,
} from '@timelinx/react';
import { TimelineEditor, TimelineProvider, frameToTimecode } from '@timelinx/ui';
import { getEngine, resetEngine, addAssetToTimeline } from './lib/engine';
import { TrackHeader } from './components/TrackHeader';
import { EffectsRack } from './components/EffectsRack';
import { AudioMixer } from './components/AudioMixer';
import {
  Film,
  Sliders,
  Music,
  Download,
  Monitor,
  Palette,
  type LucideIcon,
} from 'lucide-react';

type PanelId = 'effects' | 'color' | 'audio' | 'export';

const PANELS: { id: PanelId; label: string; icon: LucideIcon }[] = [
  { id: 'effects', label: 'Effects Rack', icon: Sliders },
  { id: 'color', label: 'Color Grading', icon: Palette },
  { id: 'audio', label: 'Audio Mixer', icon: Music },
  { id: 'export', label: 'Export', icon: Download },
];

export default function App() {
  const [engine] = useState(() => getEngine());
  const [activePanel, setActivePanel] = useState<PanelId>('effects');

  const handleAssetDrop = useCallback((drop: { assetId: string; trackId: string; frame: number }) => {
    addAssetToTimeline(drop);
  }, []);

  return (
    <div className="pro-shell">
      <TopBar engine={engine} />

      <div className="pro-body">
        <ToolStrip activePanel={activePanel} onPanelChange={setActivePanel} />

        <div className="pro-main">
          <div className="pro-preview-area">
            <PreviewMonitor engine={engine} />
          </div>

          <div className="pro-timeline-area">
            <div className="pro-track-headers">
              <TrackHeader trackName="V1" trackType="video" index={1} />
              <TrackHeader trackName="V2" trackType="video" index={2} />
              <TrackHeader trackName="V3" trackType="video" index={3} />
              <TrackHeader trackName="A1" trackType="audio" index={1} />
              <TrackHeader trackName="A2" trackType="audio" index={2} />
              <TrackHeader trackName="A3" trackType="audio" index={3} />
            </div>

            <div className="pro-timeline-canvas">
              <TimelineProvider engine={engine}>
                <TimelineEditor
                  engine={engine}
                  style={{ height: '100%' }}
                  showToolbar={true}
                  onAssetDrop={handleAssetDrop}
                />
              </TimelineProvider>
            </div>
          </div>
        </div>

        <SidePanel activePanel={activePanel} engine={engine} />
      </div>
    </div>
  );
}

function TopBar({ engine }: { engine: TimelineEngine }) {
  const frame = usePlayheadFrame(engine);
  const timeline = useTimelineWithEngine(engine);
  const fps = timeline?.fps ?? 30;

  const handleReset = useCallback(() => {
    resetEngine();
    window.location.reload();
  }, []);

  return (
    <header className="pro-topbar">
      <div className="pro-topbar-left">
        <div className="pro-logo">
          <Monitor size={16} strokeWidth={2} />
        </div>
        <span className="pro-app-name">timelinx</span>
        <span className="pro-app-badge">pro</span>
      </div>

      <div className="pro-topbar-center">
        <span className="pro-timecode">{frameToTimecode(frame as number, fps)}</span>
      </div>

      <div className="pro-topbar-right">
        <button className="pro-topbar-btn" onClick={handleReset} title="Reset">
          New Sequence
        </button>
      </div>
    </header>
  );
}

function ToolStrip({
  activePanel,
  onPanelChange,
}: {
  activePanel: PanelId;
  onPanelChange: (id: PanelId) => void;
}) {
  return (
    <div className="pro-toolstrip">
      {PANELS.map((panel) => (
        <button
          key={panel.id}
          className={`pro-toolstrip-btn${activePanel === panel.id ? ' active' : ''}`}
          onClick={() => onPanelChange(panel.id)}
          title={panel.label}
        >
          <panel.icon size={16} strokeWidth={1.8} />
          <span className="pro-toolstrip-label">{panel.label}</span>
        </button>
      ))}
    </div>
  );
}

function PreviewMonitor({ engine }: { engine: TimelineEngine }) {
  const frame = usePlayheadFrame(engine);
  const isPlaying = useIsPlaying(engine);
  const playback = usePlaybackEngine(engine);
  const timeline = useTimelineWithEngine(engine);
  const fps = timeline?.fps ?? 30;
  const durationFrames = timeline?.duration ?? 0;

  const progress = durationFrames > 0 ? ((frame as number) / durationFrames) * 100 : 0;

  const handlePlayPause = () => {
    if (isPlaying) {
      playback?.pause();
    } else {
      playback?.play();
    }
  };

  return (
    <div className="pro-preview">
      <div className="pro-preview-viewport">
        <div className="pro-preview-empty">
          <Monitor size={40} strokeWidth={1} />
          <span>No media loaded</span>
        </div>
      </div>

      <div className="pro-preview-scrubber">
        <span className="pro-timecode-sm">{formatTimecode(frame as number, fps)}</span>
        <div
          className="pro-scrubber-track"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            engine.seekTo(toFrame(Math.round(pct * durationFrames)));
          }}
        >
          <div className="pro-scrubber-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="pro-timecode-sm">{formatTimecode(durationFrames, fps)}</span>
      </div>

      <div className="pro-preview-controls">
        <div className="pro-transport">
          <button className="pro-transport-btn" onClick={() => engine.seekTo(toFrame(0))}>
            ⟪
          </button>
          <button
            className="pro-transport-btn"
            onClick={() => engine.seekTo(toFrame(Math.max(0, (frame as number) - fps)))}
          >
            ◁
          </button>
          <button className={`pro-transport-btn pro-play${isPlaying ? ' playing' : ''}`} onClick={handlePlayPause}>
            {isPlaying ? '❚❚' : '▶'}
          </button>
          <button
            className="pro-transport-btn"
            onClick={() => engine.seekTo(toFrame(Math.min(durationFrames - 1, (frame as number) + fps)))}
          >
            ▷
          </button>
          <button
            className="pro-transport-btn"
            onClick={() => engine.seekTo(toFrame(durationFrames - 1))}
          >
            ⟫
          </button>
        </div>
      </div>
    </div>
  );
}

function SidePanel({
  activePanel,
  engine,
}: {
  activePanel: PanelId;
  engine: TimelineEngine;
}) {
  return (
    <aside className="pro-sidepanel">
      <div className="pro-sidepanel-header">
        <span className="pro-sidepanel-title">
          {PANELS.find((p) => p.id === activePanel)?.label}
        </span>
      </div>
      <div className="pro-sidepanel-body">
        {activePanel === 'effects' && <EffectsRack />}
        {activePanel === 'color' && <ColorGrading />}
        {activePanel === 'audio' && <AudioMixer />}
        {activePanel === 'export' && <ExportSettings />}
      </div>
    </aside>
  );
}

function ColorGrading() {
  const [lift, setLift] = useState(0);
  const [gamma, setGamma] = useState(0);
  const [gain, setGain] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [temperature, setTemperature] = useState(0);
  const [tint, setTint] = useState(0);

  return (
    <div className="pro-color-grading">
      <div className="pro-panel-section">
        <h4 className="pro-section-title">Primary Wheels</h4>
        <div className="pro-color-wheels">
          <div className="pro-wheel-group">
            <div className="pro-wheel-label">Lift</div>
            <div className="pro-wheel-ring">
              <div className="pro-wheel-center" />
            </div>
            <input type="range" min={-100} max={100} value={lift} onChange={(e) => setLift(+e.target.value)} className="pro-slider" />
          </div>
          <div className="pro-wheel-group">
            <div className="pro-wheel-label">Gamma</div>
            <div className="pro-wheel-ring pro-wheel-gamma">
              <div className="pro-wheel-center" />
            </div>
            <input type="range" min={-100} max={100} value={gamma} onChange={(e) => setGamma(+e.target.value)} className="pro-slider" />
          </div>
          <div className="pro-wheel-group">
            <div className="pro-wheel-label">Gain</div>
            <div className="pro-wheel-ring pro-wheel-gain">
              <div className="pro-wheel-center" />
            </div>
            <input type="range" min={-100} max={100} value={gain} onChange={(e) => setGain(+e.target.value)} className="pro-slider" />
          </div>
        </div>
      </div>

      <div className="pro-panel-section">
        <h4 className="pro-section-title">Adjustments</h4>
        <div className="pro-param-row">
          <span>Saturation</span>
          <span className="pro-param-value">{saturation}%</span>
        </div>
        <input type="range" min={0} max={200} value={saturation} onChange={(e) => setSaturation(+e.target.value)} className="pro-slider" />

        <div className="pro-param-row">
          <span>Temperature</span>
          <span className="pro-param-value">{temperature}</span>
        </div>
        <input type="range" min={-100} max={100} value={temperature} onChange={(e) => setTemperature(+e.target.value)} className="pro-slider" />

        <div className="pro-param-row">
          <span>Tint</span>
          <span className="pro-param-value">{tint}</span>
        </div>
        <input type="range" min={-100} max={100} value={tint} onChange={(e) => setTint(+e.target.value)} className="pro-slider" />
      </div>

      <div className="pro-panel-section">
        <h4 className="pro-section-title">Curves</h4>
        <div className="pro-curve-box">
          <svg viewBox="0 0 120 80" className="pro-curve-svg">
            <line x1="0" y1="80" x2="120" y2="0" stroke="var(--pro-border)" strokeWidth="0.5" />
            <path d="M0,80 C40,80 80,0 120,0" fill="none" stroke="var(--pro-accent)" strokeWidth="1.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function ExportSettings() {
  const [format, setFormat] = useState('h264');
  const [resolution, setResolution] = useState('1920x1080');
  const [fps, setFps] = useState('30');
  const [bitrate, setBitrate] = useState('20');

  const presets = [
    { id: 'h264', label: 'H.264', desc: 'MP4 · Web delivery' },
    { id: 'h265', label: 'H.265', desc: 'HEVC · Smaller size' },
    { id: 'prores', label: 'ProRes 422', desc: 'MOV · Editing codec' },
    { id: 'prores4444', label: 'ProRes 4444', desc: 'MOV · With alpha' },
    { id: 'dnxhd', label: 'DNxHR', desc: 'MXF · Avid compatible' },
    { id: 'exr', label: 'EXR Sequence', desc: 'Frame sequence · VFX' },
  ];

  return (
    <div className="pro-export">
      <div className="pro-panel-section">
        <h4 className="pro-section-title">Presets</h4>
        <div className="pro-export-presets">
          {presets.map((p) => (
            <button
              key={p.id}
              className={`pro-export-preset${format === p.id ? ' active' : ''}`}
              onClick={() => setFormat(p.id)}
            >
              <span className="pro-preset-name">{p.label}</span>
              <span className="pro-preset-desc">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="pro-panel-section">
        <h4 className="pro-section-title">Output Settings</h4>
        <div className="pro-param-row">
          <span>Resolution</span>
          <select className="pro-select" value={resolution} onChange={(e) => setResolution(e.target.value)}>
            <option value="3840x2160">3840 × 2160 (4K UHD)</option>
            <option value="1920x1080">1920 × 1080 (HD)</option>
            <option value="1280x720">1280 × 720 (720p)</option>
            <option value="1080x1920">1080 × 1920 (Vertical)</option>
            <option value="1080x1080">1080 × 1080 (Square)</option>
          </select>
        </div>
        <div className="pro-param-row">
          <span>Frame Rate</span>
          <select className="pro-select" value={fps} onChange={(e) => setFps(e.target.value)}>
            <option value="23.976">23.976 fps</option>
            <option value="24">24 fps</option>
            <option value="25">25 fps</option>
            <option value="29.97">29.97 fps</option>
            <option value="30">30 fps</option>
            <option value="50">50 fps</option>
            <option value="59.94">59.94 fps</option>
            <option value="60">60 fps</option>
          </select>
        </div>
        <div className="pro-param-row">
          <span>Bitrate (Mbps)</span>
          <input className="pro-input-sm" type="number" value={bitrate} onChange={(e) => setBitrate(e.target.value)} />
        </div>
      </div>

      <div className="pro-panel-section">
        <button className="pro-export-btn">
          <Download size={14} />
          Export
        </button>
      </div>
    </div>
  );
}

function formatTimecode(frame: number, fps: number): string {
  const totalSeconds = Math.floor(frame / fps);
  const f = frame % fps;
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}
