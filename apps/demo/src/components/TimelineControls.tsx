import React, { useCallback } from 'react';
import {
  useActiveToolId,
  useIsPlaying,
  useHistory,
  useSelectedClipIds,
  useTimelineWithEngine,
  usePlayheadFrame,
} from '@webpacked-timeline/react';
import { useTimelineContext, useEngine } from '@webpacked-timeline/ui';
import {
  IconZoomIn,
  IconZoomOut,
  IconUndo,
  IconRedo,
  IconPlayerPlay,
  IconPlayerPause,
  TOOL_ICONS,
} from '@webpacked-timeline/ui';

const TOOLS = [
  { id: 'selection', label: 'Select', key: 'V' },
  { id: 'razor', label: 'Razor', key: 'C' },
  { id: 'ripple-trim', label: 'Trim', key: 'T' },
  { id: 'roll-trim', label: 'Roll', key: 'R' },
  { id: 'slip', label: 'Slip', key: 'S' },
  { id: 'slide', label: 'Slide', key: 'Y' },
  { id: 'hand', label: 'Hand', key: 'H' },
] as const;

export function TimelineControls() {
  const engine = useEngine();
  const { ppf, setPpf, vpWidth } = useTimelineContext();
  const toolId = useActiveToolId(engine);
  const isPlaying = useIsPlaying(engine);
  const history = useHistory(engine);
  const selection = useSelectedClipIds(engine);
  const timeline = useTimelineWithEngine(engine);

  const handleFitToWidth = useCallback(() => {
    const duration = timeline?.duration ?? 1;
    if (duration > 0 && vpWidth > 0) {
      const newPpf = vpWidth / duration;
      setPpf(Math.max(0.1, Math.min(newPpf, 100)));
    }
  }, [timeline?.duration, vpWidth, setPpf]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 36,
      padding: '0 12px',
      background: 'var(--tl-toolbar-bg, #1b1d20)',
      borderBottom: '1px solid var(--tl-toolbar-border, #303338)',
      flexShrink: 0,
      gap: 8,
    }}>
      {/* Tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {TOOLS.map((tool, idx) => {
          const Icon = TOOL_ICONS[tool.id];
          const isActive = toolId === tool.id;
          return (
            <React.Fragment key={tool.id}>
              <button
                className={`tl-btn${isActive ? ' is-active' : ''}`}
                onClick={() => engine.activateTool(tool.id)}
                title={`${tool.label} (${tool.key})`}
              >
                {Icon ? <Icon size={14} /> : tool.id}
              </button>
              {idx === 0 && (
                <div style={{ width: 1, height: 16, background: 'var(--tl-separator)', margin: '0 4px' }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Zoom + Fit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          className="tl-btn"
          onClick={() => setPpf(ppf * 0.8)}
          title="Zoom Out"
        >
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
        <button
          className="tl-btn"
          onClick={() => setPpf(ppf * 1.25)}
          title="Zoom In"
        >
          <IconZoomIn size={12} />
        </button>
        <span style={{ fontSize: 10, minWidth: 48, textAlign: 'right', opacity: 0.7, fontFamily: 'monospace' }}>
          {Math.round(ppf * 100) / 100} px/f
        </span>

        <div style={{ width: 1, height: 16, background: 'var(--tl-separator)', margin: '0 6px' }} />

        <button
          className="tl-btn"
          onClick={handleFitToWidth}
          title="Fit timeline to window width"
          style={{ fontSize: 10, padding: '0 8px', whiteSpace: 'nowrap' }}
        >
          Fit
        </button>
      </div>

      {/* History + Playback */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          className="tl-btn"
          onClick={() => engine.undo()}
          disabled={!history.canUndo}
          title="Undo"
        >
          <IconUndo size={12} />
        </button>
        <button
          className="tl-btn"
          onClick={() => engine.redo()}
          disabled={!history.canRedo}
          title="Redo"
        >
          <IconRedo size={12} />
        </button>

        <div style={{ width: 1, height: 16, background: 'var(--tl-separator)', margin: '0 6px' }} />

        <button
          className="tl-btn"
          onClick={() => (isPlaying ? engine.playbackEngine?.pause() : engine.playbackEngine?.play())}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <IconPlayerPause size={12} /> : <IconPlayerPlay size={12} />}
        </button>

        {selection.size > 0 && (
          <span style={{ fontSize: 10, marginLeft: 8, color: 'var(--tl-clip-border-sel)' }}>
            {selection.size} sel
          </span>
        )}
      </div>
    </div>
  );
}
