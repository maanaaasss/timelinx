import React, { useCallback } from 'react';
import { usePlayheadFrame, useIsPlaying, useTimelineWithEngine } from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';
import { frameToTimecode } from '../shared/time';
import {
  IconPlayerPlay,
  IconPlayerPause,
} from './icons';
import {
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Maximize,
} from 'lucide-react';

export interface TransportControlsProps {
  className?: string;
}

export const TransportControls = React.memo(function TransportControls({
  className,
}: TransportControlsProps) {
  const { engine } = useTimelineContext();
  const frame = usePlayheadFrame(engine);
  const isPlaying = useIsPlaying(engine);
  const timeline = useTimelineWithEngine(engine);

  const fps = (timeline?.fps as number) || 30;
  const duration = (timeline?.duration as number) || 0;

  const togglePlay = useCallback(() => {
    isPlaying ? engine.playbackEngine?.pause() : engine.playbackEngine?.play();
  }, [isPlaying, engine]);

  const skipBack = useCallback(() => {
    engine.seekTo(0 as any);
  }, [engine]);

  const skipForward = useCallback(() => {
    engine.seekTo(Math.max(0, duration - 1) as any);
  }, [engine, duration]);

  const stepBack = useCallback(() => {
    engine.seekTo(Math.max(0, (frame as number) - 1) as any);
  }, [engine, frame]);

  const stepForward = useCallback(() => {
    engine.seekTo(Math.min(duration - 1, (frame as number) + 1) as any);
  }, [engine, frame, duration]);

  const currentTimecode = frameToTimecode(frame as number, fps);
  const durationTimecode = frameToTimecode(duration, fps);

  return (
    <div className={`transport-controls${className ? ` ${className}` : ''}`}>
      <div className="transport-position">
        <span className="transport-position-current">{currentTimecode}</span>
        <span style={{ opacity: 0.5 }}> / </span>
        <span>{durationTimecode}</span>
      </div>

      <div className="transport-buttons">
        <button className="transport-btn" title="Skip to start" onClick={skipBack}>
          <SkipBack size={18} />
        </button>
        <button className="transport-btn" title="Previous frame" onClick={stepBack}>
          <ChevronLeft size={18} />
        </button>
        <button
          className={`transport-btn transport-btn--play${isPlaying ? ' active' : ''}`}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          onClick={togglePlay}
        >
          {isPlaying ? <IconPlayerPause size={20} /> : <IconPlayerPlay size={20} />}
        </button>
        <button className="transport-btn" title="Next frame" onClick={stepForward}>
          <ChevronRight size={18} />
        </button>
        <button className="transport-btn" title="Skip to end" onClick={skipForward}>
          <SkipForward size={18} />
        </button>
      </div>

      <div className="transport-right">
        <button className="transport-btn-sm" title="Volume">
          <Volume2 size={16} />
        </button>
        <button className="transport-btn-sm" title="Fullscreen">
          <Maximize size={16} />
        </button>
      </div>
    </div>
  );
});
