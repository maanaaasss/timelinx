import React from 'react';
import {
  useActiveToolId,
  useIsPlaying,
  useHistory,
  useSelectedClipIds,
  usePlayheadFrame,
  useTimelineWithEngine,
} from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';
import {
  IconZoomIn,
  IconZoomOut,
  IconUndo,
  IconRedo,
  IconPlayerPlay,
  IconPlayerPause,
  TOOL_ICONS,
} from './icons';
import { frameToTimecode } from '../shared/time';

const TOOLS = [
  { id: 'selection', label: 'Select', key: 'V' },
  { id: 'razor', label: 'Razor', key: 'C' },
  { id: 'ripple-trim', label: 'Trim', key: 'T' },
  { id: 'roll-trim', label: 'Roll', key: 'R' },
  { id: 'slip', label: 'Slip', key: 'S' },
  { id: 'slide', label: 'Slide', key: 'Y' },
  { id: 'hand', label: 'Hand', key: 'H' },
] as const;

export const TimelineToolbar = React.memo(function TimelineToolbar() {
  const { engine, ppf, setPpf } = useTimelineContext();
  const toolId = useActiveToolId(engine);
  const isPlaying = useIsPlaying(engine);
  const history = useHistory(engine);
  const selection = useSelectedClipIds(engine);
  const frame = usePlayheadFrame(engine);
  const timeline = useTimelineWithEngine(engine);

  const fps = (timeline?.fps as number) || 30;
  const duration = (timeline?.duration as number) || 0;
  const currentTimecode = frameToTimecode(frame as number, fps);
  const durationTimecode = frameToTimecode(duration, fps);

  return (
    <div className="tl-toolbar" role="toolbar" aria-label="Timeline tools">
      {/* ── Left: tools ── */}
      <div className="tl-toolbar-group" role="radiogroup" aria-label="Editing tools">
        {TOOLS.map((tool, idx) => {
          const Icon = TOOL_ICONS[tool.id];
          const isActive = toolId === tool.id;
          return (
            <React.Fragment key={tool.id}>
              <button
                className={`tl-btn-icon${isActive ? ' is-active' : ''}`}
                onClick={() => engine.activateTool(tool.id)}
                title={`${tool.label} (${tool.key})`}
                aria-label={`${tool.label} tool (${tool.key})`}
                role="radio"
                aria-checked={isActive}
              >
                {Icon ? <Icon size={16} /> : tool.id}
              </button>
              {idx === 0 && (
                <div style={{ width: 1, height: 20, background: 'var(--tl-separator)', margin: '0 4px' }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Center: Timecode ── */}
      <div className="tl-toolbar-group" style={{ gap: 10 }}>
        <span style={{
          fontFamily: '"JetBrains Mono", "SF Mono", monospace',
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '0.05em',
          color: 'var(--tl-timecode-color)',
          padding: '0 14px',
        }}>
          {currentTimecode}
          <span style={{ color: 'var(--tl-label-text-dim)', margin: '0 6px' }}>/</span>
          {durationTimecode}
        </span>
      </div>

      {/* ── Right: Zoom, History & Playback ── */}
      <div className="tl-toolbar-group">
        <button
          className="tl-btn-icon"
          onClick={() => setPpf(ppf * 0.8)}
          aria-label="Zoom Out"
          title="Zoom Out"
        >
          <IconZoomOut size={16} />
        </button>
        <input
          type="range"
          min={Math.log(0.5)}
          max={Math.log(100)}
          step={0.01}
          value={Math.log(ppf)}
          onChange={(e) => setPpf(Math.exp(parseFloat(e.target.value)))}
          aria-label="Zoom level"
          style={{ width: 64, cursor: 'pointer', height: 4 }}
        />
        <button
          className="tl-btn-icon"
          onClick={() => setPpf(ppf * 1.25)}
          aria-label="Zoom In"
          title="Zoom In"
        >
          <IconZoomIn size={16} />
        </button>

        <div style={{ width: 1, height: 20, background: 'var(--tl-separator)', margin: '0 6px' }} />

        <button
          className="tl-btn-icon"
          onClick={() => engine.undo()}
          disabled={!history.canUndo}
          aria-label="Undo"
          title="Undo (⌘Z)"
        >
          <IconUndo size={16} />
        </button>
        <button
          className="tl-btn-icon"
          onClick={() => engine.redo()}
          disabled={!history.canRedo}
          aria-label="Redo"
          title="Redo (⌘⇧Z)"
        >
          <IconRedo size={16} />
        </button>

        <div style={{ width: 1, height: 20, background: 'var(--tl-separator)', margin: '0 6px' }} />

        <button
          className="tl-btn-icon"
          onClick={() => (isPlaying ? engine.playbackEngine?.pause() : engine.playbackEngine?.play())}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
        </button>

        {selection.size > 0 && (
          <span style={{
            fontSize: 10,
            marginLeft: 8,
            color: 'var(--tl-clip-border-sel)',
            fontWeight: 500,
          }}>
            {selection.size} selected
          </span>
        )}
      </div>
    </div>
  );
});
