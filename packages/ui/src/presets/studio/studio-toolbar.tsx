/**
 * StudioToolbar — broadcast-noir style tool bar.
 *
 * Sharp corners, monospace data, amber accent on active states.
 * Utilitarian precision meets premium dark aesthetic.
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

const TOOLS = [
  { id: 'selection', label: 'Select', key: 'V' },
  { id: 'razor', label: 'Razor', key: 'C' },
  { id: 'ripple-trim', label: 'Trim', key: 'T' },
  { id: 'roll-trim', label: 'Roll', key: 'R' },
  { id: 'slip', label: 'Slip', key: 'S' },
  { id: 'slide', label: 'Slide', key: 'Y' },
  { id: 'hand', label: 'Hand', key: 'H' },
] as const;

const controlBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 26,
  minWidth: 26,
  padding: '0 7px',
  background: 'var(--tl-btn-bg)',
  color: 'var(--tl-btn-text)',
  border: '1px solid var(--tl-btn-border)',
  borderRadius: 0,
  cursor: 'pointer',
  fontSize: 11,
  fontFamily: 'var(--tl-font-mono)',
  lineHeight: 1,
  gap: 4,
};

export const StudioToolbar = React.memo(function StudioToolbar() {
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
        padding: '0 10px',
        background: 'var(--tl-toolbar-bg)',
        borderBottom: '1px solid var(--tl-toolbar-border)',
        height: toolbarHeight,
        flexShrink: 0,
        gap: 12,
      }}
    >
      {/* ── Left: tool buttons ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 1 }} role="radiogroup" aria-label="Editing tools">
        {TOOLS.map((tool, idx) => {
          const Icon = TOOL_ICONS[tool.id];
          const isActive = toolId === tool.id;
          return (
            <React.Fragment key={tool.id}>
              <button
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
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--tl-btn-border-active)' : '2px solid transparent',
                  borderRadius: 0,
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'background 60ms, color 60ms, border-color 60ms',
                }}
              >
                {Icon ? <Icon size={15} /> : tool.id}
              </button>
              {idx === 0 && (
                <div style={{ width: 1, height: 16, background: 'var(--tl-separator)', margin: '0 4px' }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Center: zoom ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button className="tl-btn" onClick={() => setPpf(ppf * 0.8)} style={controlBtn} aria-label="Zoom Out" title="Zoom Out">
          <IconZoomOut size={12} />
        </button>
        <input
          type="range"
          min={Math.log(0.5)}
          max={Math.log(100)}
          step={0.01}
          value={Math.log(ppf)}
          onChange={(e) => setPpf(Math.exp(parseFloat(e.target.value)))}
          aria-label="Zoom level"
          style={{ width: 80, cursor: 'pointer', height: 4 }}
        />
        <button className="tl-btn" onClick={() => setPpf(ppf * 1.25)} style={controlBtn} aria-label="Zoom In" title="Zoom In">
          <IconZoomIn size={12} />
        </button>
        <span style={{
          fontFamily: 'var(--tl-font-mono)',
          fontSize: 10,
          color: 'var(--tl-ruler-text)',
          minWidth: 48,
          textAlign: 'right',
          letterSpacing: '0.02em',
        }}>
          {Math.round(ppf * 100) / 100} px/f
        </span>
      </div>

      {/* ── Right: undo/redo + play ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <button
          className="tl-btn"
          onClick={() => engine.undo()}
          disabled={!history.canUndo}
          style={{ ...controlBtn, opacity: history.canUndo ? 1 : 0.3 }}
          aria-label="Undo (Cmd+Z)"
          title="Undo (Cmd+Z)"
        >
          <IconUndo size={12} />
        </button>
        <button
          className="tl-btn"
          onClick={() => engine.redo()}
          disabled={!history.canRedo}
          style={{ ...controlBtn, opacity: history.canRedo ? 1 : 0.3 }}
          aria-label="Redo (Cmd+Shift+Z)"
          title="Redo (Cmd+Shift+Z)"
        >
          <IconRedo size={12} />
        </button>

        <div style={{ width: 1, height: 18, background: 'var(--tl-separator)', margin: '0 6px' }} />

        <button
          className="tl-btn"
          onClick={() => (isPlaying ? engine.playbackEngine?.pause() : engine.playbackEngine?.play())}
          style={{
            ...controlBtn,
            color: isPlaying ? 'var(--tl-playhead-color)' : 'var(--tl-play-btn)',
            borderColor: isPlaying ? 'var(--tl-playhead-color)' : 'var(--tl-btn-border)',
          }}
          aria-label={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? <IconPlayerPause size={14} /> : <IconPlayerPlay size={14} />}
        </button>

        {selection.size > 0 && (
          <span
            style={{
              fontFamily: 'var(--tl-font-mono)',
              fontSize: 10,
              color: 'var(--tl-clip-selected)',
              marginLeft: 6,
              letterSpacing: '0.04em',
            }}
          >
            {selection.size} sel
          </span>
        )}
      </div>
    </div>
  );
});
