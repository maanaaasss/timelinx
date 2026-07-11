import React from 'react';
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
} from './icons';

export const TimelineToolbar = React.memo(function TimelineToolbar() {
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

  return (
    <div className="timeline-toolbar" role="toolbar" aria-label="Timeline tools">
      {/* Group 1: Selection tools */}
      <div className="toolbar-group" role="radiogroup" aria-label="Editing tools">
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
          className={`tool-btn${toolId === 'ripple-trim' ? ' active' : ''}`}
          title="Ripple (T)"
          onClick={() => engine.activateTool('ripple-trim')}
          role="radio"
          aria-checked={toolId === 'ripple-trim'}
        >
          <IconTrim size={15} />
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
      </div>

      <div className="toolbar-sep" />

      {/* Group 2: Position info */}
      <div className="toolbar-info">
        <span className="toolbar-position timecode">
          {currentTimecode}
          <span className="toolbar-sep-char">/</span>
          {durationTimecode}
        </span>
      </div>

      <div className="toolbar-spacer" />

      {/* Group 3: Zoom controls */}
      <ZoomControls ppf={ppf} onPpfChange={setPpf} />

      <div className="toolbar-sep" />

      {/* Group 4: Undo/Redo */}
      <div className="toolbar-group">
        <button
          className="tool-btn"
          title="Undo"
          onClick={() => engine.undo()}
          disabled={!history.canUndo}
        >
          <IconUndo size={15} />
        </button>
        <button
          className="tool-btn"
          title="Redo"
          onClick={() => engine.redo()}
          disabled={!history.canRedo}
        >
          <IconRedo size={15} />
        </button>
      </div>

      <div className="toolbar-sep" />

      {/* Group 5: Play/Pause */}
      <button
        className={`tool-btn${isPlaying ? ' active' : ''}`}
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        onClick={() => (isPlaying ? engine.playbackEngine?.pause() : engine.playbackEngine?.play())}
      >
        {isPlaying ? <IconPlayerPause size={15} /> : <IconPlayerPlay size={15} />}
      </button>
    </div>
  );
});
