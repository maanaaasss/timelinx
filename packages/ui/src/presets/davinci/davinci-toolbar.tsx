/**
 * DaVinciToolbar — tool buttons, zoom controls, transport.
 *
 * Three groups: [tools] | [zoom] | [undo/redo + play]
 * Reads all state from context + @webpacked-timeline/react hooks.
 */
import React from 'react';
import {
  useActiveToolId,
  useIsPlaying,
  useHistory,
  useSelectedClipIds,
} from '@webpacked-timeline/react';
import { useTimelineContext } from '../../context/timeline-context';
import {
  IconZoomIn,
  IconZoomOut,
  IconUndo,
  IconRedo,
  IconPlayerPlay,
  IconPlayerPause,
  TOOL_ICONS,
} from './icons';

// ── Constants ──────────────────────────────────────────────────────────────

const TOOLS = [
  { id: 'selection', label: 'Select', key: 'V' },
  { id: 'razor', label: 'Razor', key: 'C' },
  { id: 'ripple-trim', label: 'Trim', key: 'T' },
  { id: 'roll-trim', label: 'Roll', key: 'R' },
  { id: 'slip', label: 'Slip', key: 'S' },
  { id: 'slide', label: 'Slide', key: 'Y' },
  { id: 'hand', label: 'Hand', key: 'H' },
] as const;

const zoomBtnStyle: React.CSSProperties = {
  padding: '3px 6px',
  background: 'var(--tl-btn-bg)',
  color: 'var(--tl-btn-text)',
  border: '1px solid var(--tl-btn-border)',
  borderRadius: 3,
  cursor: 'pointer',
  fontSize: 13,
  fontFamily: 'monospace',
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

// ── Component ──────────────────────────────────────────────────────────────

export const DaVinciToolbar = React.memo(function DaVinciToolbar() {
  const { engine, ppf, setPpf, toolbarHeight } = useTimelineContext();
  const toolId = useActiveToolId(engine);
  const isPlaying = useIsPlaying(engine);
  const history = useHistory(engine);
  const selection = useSelectedClipIds(engine);

  return (
    <div
      className="tl-toolbar"
      role="toolbar"
      aria-label="Timeline tools"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        background: 'var(--tl-toolbar-bg)',
        borderBottom: '1px solid var(--tl-toolbar-border)',
        height: toolbarHeight,
        flexShrink: 0,
        gap: 8,
      }}
    >
      {/* ── Left group: tool buttons ── */}
      <div className="tl-toolbar-group tl-toolbar-tools" role="radiogroup" aria-label="Editing tools">
        {TOOLS.map((tool) => {
          const Icon = TOOL_ICONS[tool.id];
          const isActive = toolId === tool.id;
          return (
            <button
              key={tool.id}
              className="tl-btn"
              onClick={() => engine.activateTool(tool.id)}
              title={`${tool.label} (${tool.key})`}
              aria-label={`${tool.label} tool (${tool.key})`}
              role="radio"
              aria-checked={isActive}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 28,
                background: isActive ? 'var(--tl-btn-bg-active)' : 'transparent',
                color: isActive ? 'var(--tl-btn-text-active)' : 'var(--tl-btn-text)',
                border: isActive ? '1px solid var(--tl-btn-border-active)' : '1px solid transparent',
                borderRadius: 4,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {Icon ? <Icon size={16} /> : tool.id}
            </button>
          );
        })}
      </div>

      {/* ── Center group: zoom ── */}
      <div className="tl-toolbar-group tl-toolbar-zoom">
        <button className="tl-btn" onClick={() => setPpf(ppf * 0.8)} style={zoomBtnStyle} aria-label="Zoom Out" title="Zoom Out">
          <IconZoomOut size={14} />
        </button>
        <input
          type="range"
          min={Math.log(0.5)}
          max={Math.log(100)}
          step={0.01}
          value={Math.log(ppf)}
          onChange={(e) => setPpf(Math.exp(parseFloat(e.target.value)))}
          aria-label="Zoom level"
          style={{ width: 92, cursor: 'pointer' }}
        />
        <button className="tl-btn" onClick={() => setPpf(ppf * 1.25)} style={zoomBtnStyle} aria-label="Zoom In" title="Zoom In">
          <IconZoomIn size={14} />
        </button>
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--tl-ruler-text)', minWidth: 46 }}>
          {Math.round(ppf * 100) / 100} px/f
        </span>
      </div>

      {/* ── Right group: undo/redo + play ── */}
      <div className="tl-toolbar-group tl-toolbar-history">
        <button
          className="tl-btn"
          onClick={() => engine.undo()}
          disabled={!history.canUndo}
          style={{ ...zoomBtnStyle, opacity: history.canUndo ? 1 : 0.3 }}
          aria-label="Undo (Cmd+Z)"
          title="Undo (Cmd+Z)"
        >
          <IconUndo size={14} />
        </button>
        <button
          className="tl-btn"
          onClick={() => engine.redo()}
          disabled={!history.canRedo}
          style={{ ...zoomBtnStyle, opacity: history.canRedo ? 1 : 0.3 }}
          aria-label="Redo (Cmd+Shift+Z)"
          title="Redo (Cmd+Shift+Z)"
        >
          <IconRedo size={14} />
        </button>

        {/* Separator */}
        <div style={{ width: 1, height: 20, background: 'var(--tl-separator)', margin: '0 4px' }} />

        <button
          className="tl-btn"
          onClick={() => (isPlaying ? engine.playbackEngine?.pause() : engine.playbackEngine?.play())}
          style={{ ...zoomBtnStyle, color: isPlaying ? 'var(--tl-playhead-color)' : 'var(--tl-play-btn)' }}
          aria-label={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
        </button>

        {selection.size > 0 && (
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 10,
              color: 'var(--tl-clip-selected)',
              marginLeft: 2,
            }}
          >
            {selection.size} sel
          </span>
        )}
      </div>
    </div>
  );
});
