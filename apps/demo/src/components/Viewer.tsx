import React, { useRef } from 'react';
import type { TimelineEngine } from '@timelinx/react';
import { usePlayheadFrame, useIsPlaying, useTimelineWithEngine } from '@timelinx/react';
import { Play, Pause, SkipBack, SkipForward, Volume2, StepBack, StepForward } from 'lucide-react';
import { toFrame } from '@timelinx/core';

interface ViewerProps {
  engine: TimelineEngine;
}

export function Viewer({ engine }: ViewerProps) {
  const frame = usePlayheadFrame(engine);
  const isPlaying = useIsPlaying(engine);
  const timeline = useTimelineWithEngine(engine);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fps = timeline?.fps ?? 30;
  const durationFrames = timeline?.duration ?? 0;
  const currentTimecode = formatTimecode(frame as number, fps);

  const progress = durationFrames > 0 ? ((frame as number) / durationFrames) * 100 : 0;

  const handlePlayPause = () => {
    if (isPlaying) {
      engine.playbackEngine?.pause();
    } else {
      engine.playbackEngine?.play();
    }
  };

  const handleSkipBack = () => {
    const newFrame = Math.max(0, (frame as number) - fps);
    engine.seekTo(toFrame(newFrame));
  };

  const handleSkipForward = () => {
    const newFrame = Math.min(durationFrames - 1, (frame as number) + fps);
    engine.seekTo(toFrame(newFrame));
  };

  return (
    <div ref={containerRef} className="preview-panel">
      {/* Preview Viewport */}
      <div className="preview-viewport">
        <video
          ref={videoRef}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            display: 'none',
          }}
        />

        {/* Empty State */}
        <div className="preview-empty-state">
          <div className="preview-empty-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M4 8C4 6.34315 5.34315 5 7 5H25C26.6569 5 28 6.34315 28 8V24C28 25.6569 26.6569 27 25 27H7C5.34315 27 4 25.6569 4 24V8Z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M13 11.5L21.5 16L13 20.5V11.5Z" fill="currentColor" opacity="0.5"/>
            </svg>
          </div>
          <p className="preview-empty-label">{isPlaying ? 'Playing' : 'Nothing to preview'}</p>
          <p className="preview-empty-sub">Import media files to get started</p>
        </div>
      </div>

      {/* Progress Bar / Scrubber */}
      <div className="preview-progress-container">
        <span className="timecode" style={{ minWidth: 82 }}>
          {currentTimecode}
        </span>
        <div
          className="preview-progress-bar-bg"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percent = x / rect.width;
            const newFrame = Math.round(percent * durationFrames);
            engine.seekTo(toFrame(newFrame));
          }}
        >
          <div
            className="preview-progress-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="timecode" style={{ minWidth: 82, textAlign: 'right' }}>
          {formatTimecode(durationFrames, fps)}
        </span>
      </div>

      {/* Controls Bar */}
      <div className="preview-controls">
        <span className="timecode">{currentTimecode}</span>

        <div className="transport">
          <button className="transport-btn" title="Go to start" onClick={() => engine.seekTo(toFrame(0))}>
            <StepBack size={12} />
          </button>
          <button className="transport-btn" title="Skip Back 1s" onClick={handleSkipBack}>
            <SkipBack size={12} />
          </button>
          <button
            className={`transport-btn transport-btn--play${isPlaying ? ' active' : ''}`}
            title={isPlaying ? 'Pause' : 'Play'}
            onClick={handlePlayPause}
          >
            {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" style={{ marginLeft: 1 }} />}
          </button>
          <button className="transport-btn" title="Skip Forward 1s" onClick={handleSkipForward}>
            <SkipForward size={12} />
          </button>
          <button className="transport-btn" title="Go to end" onClick={() => engine.seekTo(toFrame(durationFrames - 1))}>
            <StepForward size={12} />
          </button>
        </div>

        <div className="preview-meta">
          <span className="timecode">{formatTimecode(durationFrames, fps)}</span>
          <button className="icon-btn" title="Volume">
            <Volume2 size={14} />
          </button>
        </div>
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
