import React, { useCallback } from 'react';
import {
  useActiveToolId,
  useIsPlaying,
  useHistory,
  usePlayheadFrame,
  useTimelineWithEngine,
} from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';
import { frameToTimecode } from '../shared/time';
import { ZoomControls } from './zoom-controls';
import {
  IconCursor,
  IconRazor,
  IconSlip,
  IconSlide,
  IconTrim,
  IconHand,
  IconUndo,
  IconRedo,
  IconPlayerPlay,
  IconPlayerPause,
  IconSnap,
} from './icons';

export interface TimelineToolbarProps {
  className?: string;
}

export const TimelineToolbar = React.memo(function TimelineToolbar({
  className,
}: TimelineToolbarProps) {
  const { engine, ppf, setPpf } = useTimelineContext();
  const toolId = useActiveToolId(engine);
  const isPlaying = useIsPlaying(engine);
  const history = useHistory(engine);
  const frame = usePlayheadFrame(engine);
  const timeline = useTimelineWithEngine(engine);

  const fps = (timeline?.fps as number) || 30;
  const duration = (timeline?.duration as number) || 0;
  const currentTimecode = frameToTimecode(frame as number, fps);
  const durationTimecode = frameToTimecode(duration, fps);

  const togglePlay = useCallback(() => {
    isPlaying ? engine.playbackEngine?.pause() : engine.playbackEngine?.play();
  }, [isPlaying, engine]);

  return (
    <div className={`tl-toolbar${className ? ` ${className}` : ''}`} role="toolbar" aria-label="Timeline tools">
      {/* Group 1: Undo/Redo */}
      <div className="tl-tool-group">
        <button
          className="tool-btn"
          title="Undo (Ctrl+Z)"
          onClick={() => engine.undo()}
          disabled={!history.canUndo}
        >
          <IconUndo size={15} />
        </button>
        <button
          className="tool-btn"
          title="Redo (Ctrl+Shift+Z)"
          onClick={() => engine.redo()}
          disabled={!history.canRedo}
        >
          <IconRedo size={15} />
        </button>
      </div>

      <div className="tl-sep" />

      {/* Group 2: Selection tools */}
      <div className="tl-tool-group" role="radiogroup" aria-label="Editing tools">
        <button
          className={`tool-btn${toolId === 'selection' ? ' active' : ''}`}
          title="Select (V)"
          onClick={() => engine.activateTool('selection')}
          role="radio"
          aria-checked={toolId === 'selection'}
        >
          <IconCursor size={15} />
        </button>
        <button
          className={`tool-btn${toolId === 'razor' ? ' active' : ''}`}
          title="Razor (C)"
          onClick={() => engine.activateTool('razor')}
          role="radio"
          aria-checked={toolId === 'razor'}
        >
          <IconRazor size={15} />
        </button>
        <button
          className={`tool-btn${toolId === 'ripple-trim' ? ' active' : ''}`}
          title="Ripple Trim (T)"
          onClick={() => engine.activateTool('ripple-trim')}
          role="radio"
          aria-checked={toolId === 'ripple-trim'}
        >
          <IconTrim size={15} />
        </button>
        <button
          className={`tool-btn${toolId === 'slip' ? ' active' : ''}`}
          title="Slip (S)"
          onClick={() => engine.activateTool('slip')}
          role="radio"
          aria-checked={toolId === 'slip'}
        >
          <IconSlip size={15} />
        </button>
        <button
          className={`tool-btn${toolId === 'slide' ? ' active' : ''}`}
          title="Slide (Y)"
          onClick={() => engine.activateTool('slide')}
          role="radio"
          aria-checked={toolId === 'slide'}
        >
          <IconSlide size={15} />
        </button>
        <button
          className={`tool-btn${toolId === 'hand' ? ' active' : ''}`}
          title="Hand (H)"
          onClick={() => engine.activateTool('hand')}
          role="radio"
          aria-checked={toolId === 'hand'}
        >
          <IconHand size={15} />
        </button>
        <button
          className="tool-btn"
          title="Snap"
        >
          <IconSnap size={15} />
        </button>
      </div>

      <div className="tl-sep" />

      {/* Position display */}
      <span className="toolbar-position">
        <span>{currentTimecode}</span>
        <span className="toolbar-sep-char">/</span>
        <span>{durationTimecode}</span>
      </span>

      <div className="tl-spacer" />

      {/* Zoom */}
      <ZoomControls ppf={ppf} onPpfChange={setPpf} />

      <div className="tl-sep" />

      {/* Play in toolbar */}
      <button
        className={`tool-btn${isPlaying ? ' active' : ''}`}
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        aria-pressed={isPlaying}
        onClick={togglePlay}
      >
        {isPlaying ? <IconPlayerPause size={15} /> : <IconPlayerPlay size={15} />}
      </button>
    </div>
  );
});
