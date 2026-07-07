import { useCallback } from 'react';
import {
  useEngine,
  useCanUndoRedo,
  useActiveTool,
  useSelectedClipIds,
} from '@timelinx/react';
import type { TimelineFrame, ClipId, TrackId, TimelinePointerEvent, Modifiers } from '@timelinx/core';
import { ZoomControls } from './ZoomControls';

const TOOLS = [
  { id: 'selection', label: 'V', title: 'Selection (V)' },
  { id: 'razor', label: 'B', title: 'Razor (B)' },
  { id: 'ripple-trim', label: 'R', title: 'Ripple Trim (R)' },
  { id: 'roll-trim', label: 'T', title: 'Roll Trim (T)' },
  { id: 'slip', label: 'Y', title: 'Slip (Y)' },
  { id: 'transition', label: 'G', title: 'Transition (G)' },
  { id: 'keyframe', label: 'P', title: 'Keyframe (P)' },
  { id: 'hand', label: 'H', title: 'Hand (H)' },
  { id: 'zoom', label: 'Z', title: 'Zoom (Z)' },
];

const IDLE_MODIFIERS: Modifiers = { shift: false, alt: false, ctrl: false, meta: false };

function buildSyntheticPointerEvent(
  frame: TimelineFrame,
  clipId: ClipId | null,
  trackId: TrackId | null,
): TimelinePointerEvent {
  return {
    frame,
    trackId,
    clipId,
    x: 0,
    y: 0,
    buttons: 1,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    edge: 'none',
  };
}

export function Toolbar() {
  const engine = useEngine();
  const { canUndo, canRedo } = useCanUndoRedo();
  const activeTool = useActiveTool();
  const selectedClipIds = useSelectedClipIds(engine);

  const handleUndo = useCallback(() => engine.undo(), [engine]);
  const handleRedo = useCallback(() => engine.redo(), [engine]);
  const handleActivateTool = useCallback(
    (toolId: string) => engine.activateTool(toolId),
    [engine],
  );

  const handleSplit = useCallback(() => {
    if (selectedClipIds.size === 0) return;
    const clipId = Array.from(selectedClipIds)[0];

    let clip = null;
    const state = engine.getState();
    for (const track of state.timeline.tracks) {
      const found = track.clips.find((c) => c.id === clipId);
      if (found) {
        clip = found;
        break;
      }
    }
    if (!clip) return;

    const playheadFrame = engine.getPlayheadFrame();
    if (playheadFrame <= clip.timelineStart || playheadFrame >= clip.timelineEnd) return;

    const previousTool = engine.getActiveToolId();

    engine.activateTool('razor');

    const event = buildSyntheticPointerEvent(
      playheadFrame,
      clip.id as ClipId,
      clip.trackId as TrackId,
    );

    engine.handlePointerDown(event, IDLE_MODIFIERS);
    engine.handlePointerUp(event, IDLE_MODIFIERS);

    engine.activateTool(previousTool);
  }, [engine, selectedClipIds]);

  const handleRippleDelete = useCallback(() => {
    if (selectedClipIds.size === 0) return;

    const previousTool = engine.getActiveToolId();

    engine.activateTool('ripple-delete');

    for (const clipId of selectedClipIds) {
      let clip = null;
      const state = engine.getState();
      for (const track of state.timeline.tracks) {
        const found = track.clips.find((c) => c.id === clipId);
        if (found) {
          clip = found;
          break;
        }
      }
      if (!clip) continue;

      const event = buildSyntheticPointerEvent(
        clip.timelineStart,
        clip.id as ClipId,
        clip.trackId as TrackId,
      );

      engine.handlePointerDown(event, IDLE_MODIFIERS);
      engine.handlePointerUp(event, IDLE_MODIFIERS);
    }

    engine.activateTool(previousTool);
  }, [engine, selectedClipIds]);

  const hasSelection = selectedClipIds.size > 0;

  return (
    <div className="toolbar">
      <div className="tool-group">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            className={`tool-btn${activeTool.id === tool.id ? ' active' : ''}`}
            title={tool.title}
            onClick={() => handleActivateTool(tool.id)}
          >
            {tool.label}
          </button>
        ))}
      </div>

      <div className="tool-separator" />

      <div className="tool-group">
        <button
          className="tool-btn tool-btn-label"
          title="Undo (Ctrl+Z)"
          disabled={!canUndo}
          onClick={handleUndo}
        >
          Undo
        </button>
        <button
          className="tool-btn tool-btn-label"
          title="Redo (Ctrl+Shift+Z)"
          disabled={!canRedo}
          onClick={handleRedo}
        >
          Redo
        </button>
      </div>

      <div className="tool-separator" />

      <div className="tool-group">
        <button
          className="tool-btn tool-btn-label"
          title="Split at playhead (via RazorTool)"
          disabled={!hasSelection}
          onClick={handleSplit}
        >
          Split
        </button>
        <button
          className="tool-btn tool-btn-label"
          title="Ripple delete selected (via RippleDeleteTool)"
          disabled={!hasSelection}
          onClick={handleRippleDelete}
        >
          Delete
        </button>
      </div>

      <div style={{ flex: 1 }} />

      <ZoomControls />
    </div>
  );
}
